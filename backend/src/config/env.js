import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const e = process.env;
const here = path.dirname(fileURLToPath(import.meta.url));
const num = (v, d) => {
  if (v === undefined || v === '') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const nodeEnv = e.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

/** Read-only view of configuration. Values are validated by assertEnv() at startup. */
export const env = {
  nodeEnv,
  isProd,
  port: num(e.PORT, 5000),
  mongoUri: e.MONGODB_URI || '',
  allowedOrigins: (e.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  jwtAccessSecret: e.JWT_ACCESS_SECRET || '',
  accessTtlSeconds: num(e.ACCESS_TOKEN_TTL_SECONDS, 900),
  refreshTtlDays: num(e.REFRESH_TOKEN_TTL_DAYS, 7),
  bcryptRounds: num(e.BCRYPT_ROUNDS, 11),
  cookieSecure: e.COOKIE_SECURE !== undefined && e.COOKIE_SECURE !== '' ? e.COOKIE_SECURE === 'true' : isProd,
  cookieSameSite: (e.COOKIE_SAMESITE || 'lax').toLowerCase(),
  cookieDomain: e.COOKIE_DOMAIN || undefined,
  trustProxy: num(e.TRUST_PROXY, isProd ? 1 : 0),
  weatherCacheMinutes: num(e.WEATHER_CACHE_MINUTES, 30),
  // Providers are tried in this order. Both are free and need no key.
  weatherProviders: (e.WEATHER_PROVIDERS || 'open-meteo,met-no')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean),
  // MET Norway requires a User-Agent that names the app and gives a contact, e.g. "AgriLink/1.2 you@example.com".
  weatherUserAgent: e.WEATHER_USER_AGENT || 'AgriLink/1.2 (university project)',
  // off = every listing goes live at once (default, fine for a demo)
  // unverified = listings from unverified farmers wait for an admin
  // all = every listing waits for an admin
  listingApproval: (e.LISTING_APPROVAL || 'off').toLowerCase(),
  // The React build that Express serves. Defaults to ../frontend/dist next to this backend folder.
  staticDir: e.STATIC_DIR ? path.resolve(e.STATIC_DIR) : path.resolve(here, '../../../frontend/dist'),
  serveFrontend: e.SERVE_FRONTEND !== 'false',
};

/** Fails fast with readable messages instead of running with an unsafe configuration. */
export function assertEnv() {
  const problems = [];
  if (!env.mongoUri) problems.push('MONGODB_URI is required.');
  if (!env.jwtAccessSecret || env.jwtAccessSecret.length < 32) {
    problems.push('JWT_ACCESS_SECRET is required and must be at least 32 characters.');
  }
  if (env.isProd && /change[_-]?me|your_super_secret|example/i.test(env.jwtAccessSecret)) {
    problems.push('JWT_ACCESS_SECRET still looks like a placeholder.');
  }
  if (!['lax', 'strict', 'none'].includes(env.cookieSameSite)) {
    problems.push('COOKIE_SAMESITE must be lax, strict or none.');
  }
  if (env.cookieSameSite === 'none' && !env.cookieSecure) {
    problems.push('COOKIE_SAMESITE=none requires COOKIE_SECURE=true.');
  }
  if (!['off', 'unverified', 'all'].includes(env.listingApproval)) {
    problems.push('LISTING_APPROVAL must be off, unverified or all.');
  }
  const knownWeather = ['open-meteo', 'met-no'];
  if (env.weatherProviders.length === 0 || env.weatherProviders.some((x) => !knownWeather.includes(x))) {
    problems.push(`WEATHER_PROVIDERS must be a comma-separated list of: ${knownWeather.join(', ')}.`);
  }
  if (env.accessTtlSeconds < 60) problems.push('ACCESS_TOKEN_TTL_SECONDS must be >= 60.');
  if (problems.length) {
    throw new Error(`Invalid configuration:\n - ${problems.join('\n - ')}`);
  }
}
