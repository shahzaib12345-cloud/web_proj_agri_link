/**
 * In-browser mock of the Express REST API. Enabled only with VITE_USE_MOCKS=true.
 * It implements the SAME paths/shapes as the real API so switching to Express needs env changes only.
 * It also enforces roles, ownership, totals and state transitions the way the real server MUST,
 * because the React UI guards are only a UX convenience.
 *
 * Everything here is fake data. Do not copy mock auth (plain passwords, localStorage DB) to production.
 */
import { ApiError } from '@/api/errors';
import {
  addDaysISO,
  checkPassword,
  inRange,
  isSafeImageUrl,
  isValidHarvestDate,
  LIMITS,
  normalizePhone,
} from '@/utils/validators';
import type {
  AdminStats,
  Article,
  BuyerOffer,
  MarketPrice,
  PriceAlert,
  ProduceListing,
  RegisterInput,
  Session,
  StoredUser,
  User,
} from '@/types';
import {
  INITIAL_ALERTS,
  INITIAL_ARTICLES,
  INITIAL_LISTINGS,
  INITIAL_MARKET_PRICES,
  INITIAL_OFFERS,
  INITIAL_USERS,
  INITIAL_WEATHER,
} from './seed';

const DB_KEY = 'agrilink_mock_db_v1';
const SESSION_KEY = 'agrilink_mock_refresh_v1';
const ACCESS_TTL_S = 15 * 60;

interface Db {
  users: StoredUser[];
  listings: ProduceListing[];
  offers: BuyerOffer[];
  prices: MarketPrice[];
  alerts: PriceAlert[];
  articles: Article[];
  favorites: Record<string, string[]>;
}

const seed = (): Db => ({
  users: structuredClone(INITIAL_USERS),
  listings: structuredClone(INITIAL_LISTINGS),
  offers: structuredClone(INITIAL_OFFERS),
  prices: structuredClone(INITIAL_MARKET_PRICES),
  alerts: structuredClone(INITIAL_ALERTS),
  articles: structuredClone(INITIAL_ARTICLES),
  favorites: { user_buyer_1: ['lst_101'] },
});

let db: Db | null = null;

function load(): Db {
  if (db) return db;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      db = JSON.parse(raw) as Db;
      return db;
    }
  } catch {
    /* fall through to seed */
  }
  db = seed();
  return db;
}

function save(): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked: mock data just stays in memory */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail = (status: number, code: string): never => {
  throw new ApiError(status, code);
};

// ---------- auth helpers ----------
const makeToken = (userId: string) => `mock.${userId}.${Date.now() + ACCESS_TTL_S * 1000}`;

function userFromToken(token: string | null): StoredUser | null {
  if (!token) return null;
  const [prefix, userId, exp] = token.split('.');
  if (prefix !== 'mock' || !userId || Number(exp) < Date.now()) return null;
  return load().users.find((u) => u.id === userId) ?? null;
}

function publicUser(u: StoredUser): User {
  const rest: Partial<StoredUser> = { ...u };
  delete rest.password;
  return rest as User;
}

function startSession(u: StoredUser): Session {
  try {
    sessionStorage.setItem(SESSION_KEY, u.id);
  } catch {
    /* ignore */
  }
  return { accessToken: makeToken(u.id), expiresIn: ACCESS_TTL_S, user: publicUser(u) };
}

// ---------- tiny router ----------
interface Ctx {
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  user: StoredUser | null;
}
type Handler = (ctx: Ctx) => unknown;
const routes: { method: string; re: RegExp; keys: string[]; handler: Handler }[] = [];

function on(method: string, pattern: string, handler: Handler): void {
  const keys: string[] = [];
  const re = new RegExp(
    '^' +
      pattern.replace(/:([A-Za-z]+)/g, (_m, k: string) => {
        keys.push(k);
        return '([^/]+)';
      }) +
      '$',
  );
  routes.push({ method, re, keys, handler });
}

function need(ctx: Ctx, ...roles: User['role'][]): StoredUser {
  if (!ctx.user) return fail(401, 'unauthenticated');
  if (roles.length && !roles.includes(ctx.user.role)) return fail(403, 'forbidden');
  return ctx.user;
}

const str = (v: unknown, max = 200): string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : '';
const num = (v: unknown): number => (typeof v === 'number' ? v : Number.NaN);

// ---------- views (what the server is allowed to reveal) ----------
function listingView(l: ProduceListing): ProduceListing {
  const farmer = load().users.find((u) => u.id === l.farmerId);
  return {
    ...l,
    farmerRating: farmer?.rating,
    farmerReviews: farmer?.reviewsCount,
    farmerVerified: farmer?.isVerified ?? false,
  };
}

/** Counterpart phone numbers are revealed only after the deal is accepted. */
function offerView(o: BuyerOffer): BuyerOffer {
  const reveal = o.status === 'accepted' || o.status === 'completed';
  return { ...o, farmerPhone: reveal ? o.farmerPhone : '', buyerPhone: reveal ? o.buyerPhone : '' };
}

const items = <T>(list: T[]) => ({ items: list });

// ---------- AUTH ----------
function validateRegister(b: Record<string, unknown>): RegisterInput {
  const phone = typeof b.phone === 'string' ? normalizePhone(b.phone) : null;
  if (!phone) return fail(400, 'invalid_phone');
  if (typeof b.password !== 'string' || checkPassword(b.password))
    return fail(400, 'invalid_password');
  const name = str(b.name, LIMITS.textShort);
  if (name.length < 2) return fail(400, 'invalid_name');
  if (b.role !== 'farmer' && b.role !== 'buyer') return fail(400, 'invalid_role'); // admin can never self-register
  const district = str(b.district, LIMITS.textShort);
  const tehsil = str(b.tehsil, LIMITS.textShort);
  const village = str(b.village, LIMITS.textShort);
  if (!district || !tehsil) return fail(400, 'invalid_location');
  const farmSize = b.farmSizeAcres === undefined ? undefined : num(b.farmSizeAcres);
  if (
    b.role === 'farmer' &&
    farmSize !== undefined &&
    !inRange(farmSize, LIMITS.farmSizeAcres.min, LIMITS.farmSizeAcres.max)
  )
    return fail(400, 'invalid_farm_size');
  const crops = Array.isArray(b.cropsGrown)
    ? b.cropsGrown.filter((c): c is string => typeof c === 'string').slice(0, 20)
    : [];
  const buyerTypes = ['wholesaler', 'retailer', 'processor', 'individual'];
  const buyerType =
    b.role === 'buyer' && typeof b.buyerType === 'string' && buyerTypes.includes(b.buyerType)
      ? (b.buyerType as RegisterInput['buyerType'])
      : undefined;
  return {
    phone,
    password: b.password,
    name,
    role: b.role,
    district,
    tehsil,
    village,
    cropsGrown: crops,
    farmSizeAcres: farmSize,
    buyerType,
  };
}

on('POST', '/auth/register', ({ body }) => {
  const input = validateRegister(body);
  const d = load();
  if (d.users.some((u) => u.phone === input.phone)) fail(409, 'phone_taken');
  const user: StoredUser = {
    id: `user_${crypto.randomUUID()}`,
    phone: input.phone,
    password: input.password,
    name: input.name,
    role: input.role,
    location: { district: input.district, tehsil: input.tehsil, village: input.village },
    cropsGrown: input.role === 'farmer' ? (input.cropsGrown ?? []) : [],
    farmSizeAcres: input.role === 'farmer' ? input.farmSizeAcres : undefined,
    buyerType: input.buyerType,
    isVerified: false,
    rating: undefined,
    reviewsCount: 0,
    joinedDate: addDaysISO(0),
  };
  d.users.push(user);
  save();
  return startSession(user);
});

on('POST', '/auth/login', ({ body }) => {
  const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : null;
  const user = phone ? load().users.find((u) => u.phone === phone) : undefined;
  // One generic error for unknown phone AND wrong password (no account enumeration).
  if (!user || user.password !== body.password) return fail(401, 'invalid_credentials');
  return startSession(user);
});

on('POST', '/auth/refresh', () => {
  let id: string | null = null;
  try {
    id = sessionStorage.getItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  const user = id ? load().users.find((u) => u.id === id) : undefined;
  if (!user) return fail(401, 'no_session');
  return startSession(user);
});

on('POST', '/auth/logout', () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  return null;
});

on('GET', '/auth/me', (ctx) => publicUser(need(ctx)));

on('PATCH', '/users/me', (ctx) => {
  const me = need(ctx);
  const b = ctx.body;
  const name = b.name === undefined ? me.name : str(b.name, LIMITS.textShort);
  if (name.length < 2) fail(400, 'invalid_name');
  me.name = name; // role / isVerified / rating are never client-editable
  save();
  return publicUser(me);
});

// ---------- LISTINGS ----------
on('GET', '/listings', () =>
  items(
    load()
      .listings.filter((l) => l.isModerated && l.status !== 'sold')
      .map(listingView),
  ),
);

on('GET', '/listings/mine', (ctx) => {
  const me = need(ctx, 'farmer');
  return items(
    load()
      .listings.filter((l) => l.farmerId === me.id)
      .map(listingView),
  );
});

on('POST', '/listings', (ctx) => {
  const me = need(ctx, 'farmer');
  const b = ctx.body;
  const categories = ['Cereals & Grains', 'Vegetables', 'Tubers & Roots', 'Legumes', 'Fruits'];
  const units = ['Maund (40 kg / من)', 'Bori (50 kg / بوری)', 'Crate (پیٹی)', 'kg (کلو)'];
  const quantity = num(b.quantity);
  const pricePerUnit = num(b.pricePerUnit);
  const minOrderQuantity = num(b.minOrderQuantity);
  const harvestDate = typeof b.harvestDate === 'string' ? b.harvestDate : '';
  const imageUrl = typeof b.imageUrl === 'string' ? b.imageUrl : '';
  if (!str(b.cropName, LIMITS.textShort) || !str(b.variety, LIMITS.textShort))
    fail(400, 'invalid_text');
  if (typeof b.category !== 'string' || !categories.includes(b.category))
    fail(400, 'invalid_category');
  if (typeof b.unit !== 'string' || !units.includes(b.unit)) fail(400, 'invalid_unit');
  if (!inRange(quantity, LIMITS.quantity.min, LIMITS.quantity.max)) fail(400, 'invalid_quantity');
  if (!inRange(pricePerUnit, LIMITS.price.min, LIMITS.price.max)) fail(400, 'invalid_price');
  if (!inRange(minOrderQuantity, 1, quantity)) fail(400, 'invalid_min_order');
  if (!isValidHarvestDate(harvestDate)) fail(400, 'invalid_harvest_date');
  if (!isSafeImageUrl(imageUrl)) fail(400, 'invalid_image');
  const listing: ProduceListing = {
    id: `lst_${crypto.randomUUID()}`,
    farmerId: me.id, // derived from the token, never from the body
    farmerName: me.name,
    farmerLocation: { district: me.location.district, tehsil: me.location.tehsil },
    cropName: str(b.cropName, LIMITS.textShort),
    variety: str(b.variety, LIMITS.textShort),
    category: b.category as ProduceListing['category'],
    quantity,
    unit: b.unit as ProduceListing['unit'],
    pricePerUnit,
    currency: 'PKR',
    minOrderQuantity,
    harvestDate,
    availableUntil: addDaysISO(30),
    description: typeof b.description === 'string' ? b.description.slice(0, LIMITS.textLong) : '',
    imageUrl,
    status: 'active',
    isModerated: true, // TODO(api): the real server decides (e.g. only verified farmers auto-approve)
    createdAt: new Date().toISOString(),
  };
  load().listings.unshift(listing);
  save();
  return listingView(listing);
});

on('DELETE', '/listings/:id', (ctx) => {
  const me = need(ctx, 'farmer', 'admin');
  const d = load();
  const l = d.listings.find((x) => x.id === ctx.params.id);
  if (!l) return fail(404, 'not_found');
  if (me.role === 'farmer' && l.farmerId !== me.id) return fail(403, 'forbidden');
  d.listings = d.listings.filter((x) => x.id !== l.id);
  save();
  return null;
});

// ---------- FAVORITES ----------
on('GET', '/favorites', (ctx) => items(load().favorites[need(ctx).id] ?? []));
on('PUT', '/favorites/:id', (ctx) => {
  const me = need(ctx);
  const d = load();
  if (!d.listings.some((l) => l.id === ctx.params.id)) return fail(404, 'not_found');
  const set = new Set(d.favorites[me.id] ?? []);
  set.add(ctx.params.id);
  d.favorites[me.id] = [...set];
  save();
  return null;
});
on('DELETE', '/favorites/:id', (ctx) => {
  const me = need(ctx);
  const d = load();
  d.favorites[me.id] = (d.favorites[me.id] ?? []).filter((x) => x !== ctx.params.id);
  save();
  return null;
});

// ---------- OFFERS ----------
on('GET', '/offers', (ctx) => {
  const me = need(ctx);
  const all = load().offers;
  const mine =
    me.role === 'admin'
      ? all
      : all.filter((o) => (me.role === 'farmer' ? o.farmerId === me.id : o.buyerId === me.id));
  return items(mine.map(offerView));
});

on('POST', '/offers', (ctx) => {
  const me = need(ctx, 'buyer');
  const d = load();
  const listing = d.listings.find((l) => l.id === ctx.body.listingId);
  if (!listing || !listing.isModerated || listing.status === 'sold') return fail(404, 'not_found');
  const quantity = num(ctx.body.quantity);
  const price = num(ctx.body.offeredPricePerUnit);
  if (!inRange(quantity, listing.minOrderQuantity, listing.quantity))
    return fail(400, 'invalid_quantity');
  if (!inRange(price, LIMITS.price.min, LIMITS.price.max)) return fail(400, 'invalid_price');
  const offer: BuyerOffer = {
    id: `off_${crypto.randomUUID()}`,
    listingId: listing.id,
    cropName: listing.cropName,
    farmerId: listing.farmerId,
    farmerName: listing.farmerName,
    farmerPhone: d.users.find((u) => u.id === listing.farmerId)?.phone ?? '',
    buyerId: me.id,
    buyerName: me.name,
    buyerPhone: me.phone,
    offeredPricePerUnit: price,
    listingPricePerUnit: listing.pricePerUnit,
    quantity,
    unit: listing.unit,
    totalPrice: quantity * price, // recomputed on the server, never trusted from the client
    message: typeof ctx.body.message === 'string' ? ctx.body.message.slice(0, LIMITS.textLong) : '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  d.offers.unshift(offer);
  save();
  return offerView(offer);
});

on('PATCH', '/offers/:id/status', (ctx) => {
  const me = need(ctx, 'farmer', 'buyer');
  const d = load();
  const o = d.offers.find((x) => x.id === ctx.params.id);
  if (!o) return fail(404, 'not_found');
  const isFarmer = me.role === 'farmer' && o.farmerId === me.id;
  const isBuyer = me.role === 'buyer' && o.buyerId === me.id;
  if (!isFarmer && !isBuyer) return fail(403, 'forbidden');
  const action = ctx.body.action;
  const listing = d.listings.find((l) => l.id === o.listingId);

  if (isFarmer && o.status === 'pending' && action === 'accept') o.status = 'accepted';
  else if (isFarmer && o.status === 'pending' && action === 'reject') o.status = 'rejected';
  else if (isFarmer && o.status === 'pending' && action === 'counter') {
    const counter = num(ctx.body.counterPricePerUnit);
    if (!inRange(counter, LIMITS.price.min, LIMITS.price.max)) return fail(400, 'invalid_price');
    o.status = 'countered';
    o.counterPricePerUnit = counter;
    o.counterNote =
      typeof ctx.body.counterNote === 'string'
        ? ctx.body.counterNote.slice(0, LIMITS.textLong)
        : '';
  } else if (isBuyer && o.status === 'countered' && action === 'accept' && o.counterPricePerUnit) {
    o.status = 'accepted';
    o.offeredPricePerUnit = o.counterPricePerUnit;
    o.totalPrice = o.quantity * o.counterPricePerUnit;
  } else if (isFarmer && o.status === 'accepted' && action === 'complete') {
    o.status = 'completed';
    o.completedAt = new Date().toISOString();
  } else return fail(409, 'invalid_transition');

  if (listing)
    listing.status =
      o.status === 'completed'
        ? 'sold'
        : o.status === 'accepted'
          ? 'pending_offer'
          : listing.status;
  save();
  return offerView(o);
});

on('POST', '/offers/:id/rating', (ctx) => {
  const me = need(ctx, 'buyer');
  const d = load();
  const o = d.offers.find((x) => x.id === ctx.params.id);
  if (!o || o.buyerId !== me.id) return fail(404, 'not_found');
  if (o.status !== 'completed' || o.ratingGiven) return fail(409, 'cannot_rate');
  const rating = num(ctx.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(400, 'invalid_rating');
  o.ratingGiven = rating;
  o.reviewComment =
    typeof ctx.body.comment === 'string' ? ctx.body.comment.slice(0, LIMITS.textLong) : '';
  const farmer = d.users.find((u) => u.id === o.farmerId);
  if (farmer) {
    const count = (farmer.reviewsCount ?? 0) + 1;
    const avg = farmer.rating ?? rating;
    farmer.rating = Number(((avg * (count - 1) + rating) / count).toFixed(1));
    farmer.reviewsCount = count;
  }
  save();
  return offerView(o);
});

// ---------- PRICES & ALERTS ----------
on('GET', '/prices', () => items(load().prices));

on('PATCH', '/prices/:id', (ctx) => {
  need(ctx, 'admin');
  const p = load().prices.find((x) => x.id === ctx.params.id);
  if (!p) return fail(404, 'not_found');
  const wholesale = num(ctx.body.wholesalePrice);
  const retail = num(ctx.body.retailPrice);
  if (
    !inRange(wholesale, LIMITS.price.min, LIMITS.price.max) ||
    !inRange(retail, LIMITS.price.min, LIMITS.price.max)
  )
    return fail(400, 'invalid_price');
  const diff = wholesale - p.wholesalePrice;
  p.changePercent = Number(((diff / p.wholesalePrice) * 100).toFixed(1));
  p.trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
  const now = new Date();
  const label = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(now);
  const last = p.historicalPrices[p.historicalPrices.length - 1];
  if (last?.date === label) last.price = wholesale;
  else p.historicalPrices = [...p.historicalPrices, { date: label, price: wholesale }].slice(-10);
  p.wholesalePrice = wholesale;
  p.retailPrice = retail;
  p.lastUpdated = now.toISOString();
  save();
  return p;
});

on('GET', '/price-alerts', (ctx) => {
  const me = need(ctx);
  const d = load();
  const mine = d.alerts
    .filter((a) => a.userId === me.id)
    .map((a) => {
      const rows = d.prices.filter((p) => p.cropName === a.cropName);
      const hit = rows.some((p) =>
        a.condition === 'above'
          ? p.wholesalePrice >= a.targetPrice
          : p.wholesalePrice <= a.targetPrice,
      );
      return { ...a, isTriggered: hit };
    });
  return items(mine);
});

on('POST', '/price-alerts', (ctx) => {
  const me = need(ctx);
  const d = load();
  const target = num(ctx.body.targetPrice);
  const cropName = typeof ctx.body.cropName === 'string' ? ctx.body.cropName : '';
  if (!inRange(target, LIMITS.price.min, LIMITS.price.max)) return fail(400, 'invalid_price');
  if (!d.prices.some((p) => p.cropName === cropName)) return fail(400, 'invalid_crop');
  if (ctx.body.condition !== 'above' && ctx.body.condition !== 'below')
    return fail(400, 'invalid_condition');
  const alert: PriceAlert = {
    id: `alt_${crypto.randomUUID()}`,
    userId: me.id,
    cropName,
    targetPrice: target,
    condition: ctx.body.condition,
    isTriggered: false,
    createdAt: addDaysISO(0),
  };
  d.alerts.unshift(alert);
  save();
  return alert;
});

on('DELETE', '/price-alerts/:id', (ctx) => {
  const me = need(ctx);
  const d = load();
  d.alerts = d.alerts.filter((a) => !(a.id === ctx.params.id && a.userId === me.id));
  save();
  return null;
});

// ---------- WEATHER (the real API proxies a provider; the key lives server-side) ----------
// TODO(api): GET /weather?district= proxied + cached by Express
on('GET', '/weather', () => items(INITIAL_WEATHER));

// ---------- ARTICLES ----------
on('GET', '/articles', () => items(load().articles));
on('POST', '/articles', (ctx) => {
  need(ctx, 'admin');
  const b = ctx.body;
  const cats = [
    'Planting Calendars',
    'Pest & Disease Control',
    'Soil Fertility',
    'Post-Harvest Storage',
  ];
  const title = str(b.title, 200);
  const summary = str(b.summary, LIMITS.textLong);
  if (!title || !summary) return fail(400, 'invalid_text');
  if (typeof b.category !== 'string' || !cats.includes(b.category))
    return fail(400, 'invalid_category');
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 50) : [];
  const article: Article = {
    id: `art_${crypto.randomUUID()}`,
    title,
    category: b.category as Article['category'],
    cropTag: str(b.cropTag, LIMITS.textShort) || 'All Crops',
    author: ctx.user?.name ?? '',
    readTimeMin: 4,
    publishedDate: new Date().toISOString(),
    summary,
    content: strings(b.content),
    keyRecommendations: strings(b.keyRecommendations),
  };
  load().articles.unshift(article);
  save();
  return article;
});

// ---------- ADMIN ----------
on('GET', '/admin/stats', (ctx) => {
  need(ctx, 'admin');
  const d = load();
  const done = d.offers.filter((o) => o.status === 'completed');
  const stats: AdminStats = {
    farmers: d.users.filter((u) => u.role === 'farmer').length,
    buyers: d.users.filter((u) => u.role === 'buyer').length,
    activeListings: d.listings.filter((l) => l.status === 'active').length,
    completedOffers: done.length,
    completedValue: done.reduce((s, o) => s + o.totalPrice, 0),
    pendingVerifications: d.users.filter((u) => !u.isVerified).length,
  };
  return stats;
});
on('GET', '/admin/users', (ctx) => {
  need(ctx, 'admin');
  return items(load().users.map(publicUser));
});
on('PATCH', '/admin/users/:id/verification', (ctx) => {
  need(ctx, 'admin');
  const u = load().users.find((x) => x.id === ctx.params.id);
  if (!u) return fail(404, 'not_found');
  if (typeof ctx.body.verified !== 'boolean') return fail(400, 'invalid_body');
  u.isVerified = ctx.body.verified;
  save();
  return publicUser(u);
});
on('GET', '/admin/listings', (ctx) => {
  need(ctx, 'admin');
  return items(load().listings.map(listingView));
});
on('PATCH', '/admin/listings/:id/moderation', (ctx) => {
  need(ctx, 'admin');
  const l = load().listings.find((x) => x.id === ctx.params.id);
  if (!l) return fail(404, 'not_found');
  if (typeof ctx.body.approved !== 'boolean') return fail(400, 'invalid_body');
  l.isModerated = ctx.body.approved;
  save();
  return listingView(l);
});

// ---------- entry point used by api/client.ts ----------
export async function mockRequest(
  method: string,
  path: string,
  opts: { body?: unknown; query?: Record<string, string | undefined>; token: string | null },
): Promise<unknown> {
  await sleep(80);
  const user = userFromToken(opts.token);
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.re.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => {
      params[k] = decodeURIComponent(m[i + 1] ?? '');
    });
    const query: Record<string, string> = {};
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) query[k] = v;
    const body =
      opts.body && typeof opts.body === 'object' ? (opts.body as Record<string, unknown>) : {};
    const out = r.handler({ params, query, body, user });
    return out === null ? undefined : structuredClone(out);
  }
  return fail(404, 'not_found');
}
