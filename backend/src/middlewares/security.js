import { env } from '../config/env.js';
import { createError } from './errorHandler.js';

/** Rejects Mongo operator injection ({"$ne": ...}) and dotted keys anywhere in the body or query string. */
function hasUnsafeKeys(value, depth = 0) {
  if (depth > 8) return true;
  if (Array.isArray(value)) return value.some((v) => hasUnsafeKeys(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([k, v]) => k.startsWith('$') || k.includes('.') || hasUnsafeKeys(v, depth + 1));
  }
  return false;
}

export function rejectOperatorKeys(req, _res, next) {
  if (hasUnsafeKeys(req.body) || hasUnsafeKeys(req.query)) return next(createError(400, 'invalid_body'));
  next();
}

/**
 * Cookie-authenticated endpoints (/auth/refresh, /auth/logout) must come from a known origin.
 * Browsers always send Origin on cross-site POSTs; requests without it (curl, same-origin GET) pass.
 */
export function requireTrustedOrigin(req, _res, next) {
  const origin = req.headers.origin;
  if (!origin) return next();
  const host = req.headers.host ? `${req.protocol}://${req.headers.host}` : null;
  if (env.allowedOrigins.includes(origin) || origin === host) return next();
  const proto = req.headers['x-forwarded-proto'];
  if (proto && req.headers.host && origin === `${proto}://${req.headers.host}`) return next();
  return next(createError(403, 'forbidden'));
}

/** :id style params must be Mongo ObjectIds; anything else is simply "not found". */
export function validId(...names) {
  return (req, _res, next) => {
    for (const n of names) {
      if (!/^[a-f\d]{24}$/i.test(String(req.params[n] ?? ''))) return next(createError(404, 'not_found'));
    }
    next();
  };
}
