import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { createError } from './errorHandler.js';

/** Authenticates from the Bearer access token. Role and id always come from the database, never the client. */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) throw createError(401, 'unauthenticated');
    let payload;
    try {
      payload = jwt.verify(header.slice(7), env.jwtAccessSecret, { algorithms: ['HS256'] });
    } catch {
      throw createError(401, 'unauthenticated');
    }
    const user = await User.findById(payload.sub);
    if (!user) throw createError(401, 'unauthenticated');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(createError(403, 'forbidden'));
    next();
  };
}
