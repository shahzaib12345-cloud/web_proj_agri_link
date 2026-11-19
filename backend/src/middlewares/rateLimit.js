import rateLimit from 'express-rate-limit';
import { normalizePhone } from '../constants/limits.js';

const handler = (_req, res) => res.status(429).json({ code: 'rate_limited' });
const common = { standardHeaders: true, legacyHeaders: false, handler, validate: false };

/** Whole API: generous, because mobile carriers put many farmers behind one shared IP. */
export const apiLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 2000 });

/** Failed logins per IP (successful ones are not counted). */
export const loginIpLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
});

/** Failed logins per IP + phone, which stops targeted password guessing. */
export const loginPhoneLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${normalizePhone(req.body?.phone) ?? 'invalid'}`,
});

export const registerLimiter = rateLimit({ ...common, windowMs: 60 * 60 * 1000, limit: 20 });
export const refreshLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 300 });
