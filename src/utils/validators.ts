/** Pakistani mobile numbers: +92 3XX XXXXXXX (also accepts 03XX XXXXXXX and 92 3XX XXXXXXX). */
const PK_MOBILE = /^\+923\d{9}$/;

/** Returns the canonical +923XXXXXXXXX form, or null if the input is not a valid PK mobile. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-()]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  if (digits.startsWith('03')) digits = '+92' + digits.slice(1);
  else if (digits.startsWith('92')) digits = '+' + digits;
  return PK_MOBILE.test(digits) ? digits : null;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** Values used for tel: links: only + and digits, never raw user text. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

export type PasswordProblem = 'short' | 'long' | 'weak' | null;

export function checkPassword(pw: string): PasswordProblem {
  if (pw.length < PASSWORD_MIN) return 'short';
  if (pw.length > PASSWORD_MAX) return 'long';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'weak';
  return null;
}

export const LIMITS = {
  quantity: { min: 1, max: 1_000_000 },
  price: { min: 1, max: 10_000_000 },
  farmSizeAcres: { min: 0.1, max: 10_000 },
  textShort: 80,
  textLong: 1000,
} as const;

/** Parses a numeric input safely. Returns NaN for empty/invalid input. */
export function toNumber(raw: string): number {
  if (raw.trim() === '') return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export function inRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** Harvest date must be a real date, not in the future, and not older than a year. */
export function isValidHarvestDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const t = new Date(iso + 'T00:00:00').getTime();
  if (Number.isNaN(t)) return false;
  return iso <= todayISO() && iso >= addDaysISO(-365);
}

export function isSafeImageUrl(url: string): boolean {
  return url.startsWith('/images/') || /^https:\/\//i.test(url);
}
