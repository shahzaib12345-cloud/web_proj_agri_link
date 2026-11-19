// Strict input helpers. Nothing is coerced: a number must arrive as a JSON number, a string as a string.
const APP_TZ = 'Asia/Karachi'; // Pakistan time, so "today" matches what the farmer sees on their phone.

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Trimmed non-empty string within max length, else ''. */
export function str(v, max = 200) {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : '';
}

/** Optional text: trimmed and truncated, never throws. */
export function text(v, max = 1000) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN);
export const inRange = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
export const isObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);

export function strings(v, maxItems = 50, maxLen = 2000) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && x.length <= maxLen)
    .slice(0, maxItems);
}

/** YYYY-MM-DD for the given instant in Pakistan time. */
export const todayISO = (date = new Date()) => dayFmt.format(date);
export const addDaysISO = (days, from = new Date()) => todayISO(new Date(from.getTime() + days * 86_400_000));

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
export function isRealISODate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso);
}

/** Not in the future and not older than a year. */
export function isValidHarvestDate(iso) {
  return isRealISODate(iso) && iso <= todayISO() && iso >= addDaysISO(-365);
}

/** Only bundled images (/images/...) or absolute https URLs. */
export function isSafeImageUrl(url) {
  if (typeof url !== 'string' || url.length === 0 || url.length > 500) return false;
  if (url.startsWith('/images/')) return /^\/images\/[A-Za-z0-9._\-/]+$/.test(url) && !url.includes('..');
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Short label like "7 Nov" used by the price history chart. */
export const dayLabel = (date = new Date()) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: APP_TZ }).format(date);
