import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ProduceListing } from '../models/ProduceListing.js';
import { Offer } from '../models/Offer.js';
import { createError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { LIMITS, checkPassword, normalizePhone } from '../constants/limits.js';
import { BUYER_TYPES } from '../constants/enums.js';
import { inRange, isPlainObject, num, str, strings, todayISO } from '../utils/validate.js';

const COOKIE_NAME = 'agrilink_rt';
const COOKIE_PATH = '/api/v1/auth'; // the cookie is only ever sent to the auth endpoints
// A rotated token stays valid briefly so two browser tabs refreshing at once do not log each other out.
const ROTATION_GRACE_MS = 30_000;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const bodyOf = (req) => (isPlainObject(req.body) ? req.body : {});

let dummyHash;
/** Compared against when the phone is unknown so response time does not reveal which phones exist. */
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password-1', env.bcryptRounds));

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: COOKIE_PATH,
    domain: env.cookieDomain,
  };
}

const setRefreshCookie = (res, raw) =>
  res.cookie(COOKIE_NAME, raw, { ...cookieOptions(), maxAge: env.refreshTtlDays * 86_400_000 });
const clearRefreshCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: env.accessTtlSeconds,
  });
}

/** Creates a refresh-token row, sets the httpOnly cookie, and returns the Session the frontend expects. */
async function issueSession(res, user) {
  const raw = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + env.refreshTtlDays * 86_400_000),
  });
  setRefreshCookie(res, raw);
  return { accessToken: signAccessToken(user), expiresIn: env.accessTtlSeconds, user: user.toJSON() };
}

function validateRegister(b) {
  const phone = normalizePhone(b.phone);
  if (!phone) throw createError(400, 'invalid_phone');
  if (checkPassword(b.password)) throw createError(400, 'invalid_password');
  const name = str(b.name, LIMITS.textShort);
  if (name.length < 2) throw createError(400, 'invalid_name');
  if (b.role !== 'farmer' && b.role !== 'buyer') throw createError(400, 'invalid_role'); // admin can never self-register
  const district = str(b.district, LIMITS.textShort);
  const tehsil = str(b.tehsil, LIMITS.textShort);
  if (!district || !tehsil) throw createError(400, 'invalid_location');
  const village = typeof b.village === 'string' && b.village.length <= LIMITS.textShort ? b.village.trim() : '';

  let farmSizeAcres;
  if (b.role === 'farmer' && b.farmSizeAcres !== undefined) {
    farmSizeAcres = num(b.farmSizeAcres);
    if (!inRange(farmSizeAcres, LIMITS.farmSizeAcres.min, LIMITS.farmSizeAcres.max)) {
      throw createError(400, 'invalid_farm_size');
    }
  }
  return {
    phone,
    password: b.password,
    name,
    role: b.role,
    district,
    tehsil,
    village,
    cropsGrown: b.role === 'farmer' ? strings(b.cropsGrown, 20, LIMITS.textShort) : [],
    farmSizeAcres,
    buyerType: b.role === 'buyer' && BUYER_TYPES.includes(b.buyerType) ? b.buyerType : undefined,
  };
}

export const register = asyncHandler(async (req, res) => {
  const input = validateRegister(bodyOf(req));
  if (await User.exists({ phone: input.phone })) throw createError(409, 'phone_taken');

  const user = await User.create({
    phone: input.phone,
    password: await bcrypt.hash(input.password, env.bcryptRounds),
    name: input.name,
    role: input.role,
    location: { district: input.district, tehsil: input.tehsil, village: input.village },
    cropsGrown: input.cropsGrown,
    farmSizeAcres: input.farmSizeAcres,
    buyerType: input.buyerType,
    isVerified: false,
    reviewsCount: 0,
    joinedDate: todayISO(),
  });
  res.status(201).json(await issueSession(res, user));
});

export const login = asyncHandler(async (req, res) => {
  const b = bodyOf(req);
  const phone = normalizePhone(b.phone);
  const password = typeof b.password === 'string' ? b.password.slice(0, 128) : '';
  const user = phone ? await User.findOne({ phone }).select('+password') : null;
  const ok = await bcrypt.compare(password, user ? user.password : getDummyHash());
  // One generic error for unknown phone AND wrong password (no account enumeration).
  if (!user || !ok) throw createError(401, 'invalid_credentials');
  res.json(await issueSession(res, user));
});

export const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[COOKIE_NAME];
  if (typeof raw !== 'string' || raw.length < 20 || raw.length > 200) throw createError(401, 'no_session');

  const row = await RefreshToken.findOne({ tokenHash: sha256(raw) });
  if (!row || row.expiresAt <= new Date()) {
    clearRefreshCookie(res);
    throw createError(401, 'no_session');
  }
  const user = await User.findById(row.userId);
  if (!user) {
    await RefreshToken.deleteMany({ userId: row.userId });
    clearRefreshCookie(res);
    throw createError(401, 'no_session');
  }

  if (!row.rotatedAt) {
    row.rotatedAt = new Date();
    row.expiresAt = new Date(Date.now() + ROTATION_GRACE_MS);
    await row.save();
  }
  res.json(await issueSession(res, user));
});

export const logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[COOKIE_NAME];
  if (typeof raw === 'string' && raw) await RefreshToken.deleteOne({ tokenHash: sha256(raw) });
  clearRefreshCookie(res);
  res.status(204).end();
});

export const getMe = (req, res) => res.json(req.user.toJSON());

export const updateMe = asyncHandler(async (req, res) => {
  const me = req.user;
  const b = bodyOf(req);
  // role, isVerified, rating, phone and password are never client-editable here.

  if (b.name !== undefined) {
    const name = str(b.name, LIMITS.textShort);
    if (name.length < 2) throw createError(400, 'invalid_name');
    me.name = name;
  }
  if (b.location !== undefined) {
    const loc = isPlainObject(b.location) ? b.location : {};
    const district = str(loc.district ?? me.location.district, LIMITS.textShort);
    const tehsil = str(loc.tehsil ?? me.location.tehsil, LIMITS.textShort);
    if (!district || !tehsil) throw createError(400, 'invalid_location');
    const village =
      typeof loc.village === 'string' && loc.village.length <= LIMITS.textShort ? loc.village.trim() : me.location.village;
    me.location = { district, tehsil, village };
  }
  if (me.role === 'farmer') {
    if (b.cropsGrown !== undefined) me.cropsGrown = strings(b.cropsGrown, 20, LIMITS.textShort);
    if (b.farmSizeAcres !== undefined) {
      const size = num(b.farmSizeAcres);
      if (!inRange(size, LIMITS.farmSizeAcres.min, LIMITS.farmSizeAcres.max)) throw createError(400, 'invalid_farm_size');
      me.farmSizeAcres = size;
    }
  }
  if (me.role === 'buyer' && b.buyerType !== undefined) {
    if (!BUYER_TYPES.includes(b.buyerType)) throw createError(400, 'invalid_body');
    me.buyerType = b.buyerType;
  }
  await me.save();

  // Keep denormalised copies (shown on listings and offers) in step with the profile.
  await Promise.all([
    me.role === 'farmer' &&
      ProduceListing.updateMany(
        { farmerId: me._id },
        { $set: { farmerName: me.name, 'farmerLocation.district': me.location.district, 'farmerLocation.tehsil': me.location.tehsil } },
      ),
    me.role === 'farmer' && Offer.updateMany({ farmerId: me._id }, { $set: { farmerName: me.name } }),
    me.role === 'buyer' && Offer.updateMany({ buyerId: me._id }, { $set: { buyerName: me.name } }),
  ]);
  res.json(me.toJSON());
});
