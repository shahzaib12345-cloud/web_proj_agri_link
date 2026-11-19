// Mirrors frontend src/utils/validators.ts. The server is the authority; the UI only mirrors it.
export const LIMITS = {
  quantity: { min: 1, max: 1_000_000 },
  price: { min: 1, max: 10_000_000 },
  farmSizeAcres: { min: 0.1, max: 10_000 },
  textShort: 80,
  textLong: 1000,
};

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

const PK_MOBILE = /^\+923\d{9}$/;

/** Returns the canonical +923XXXXXXXXX form, or null if the input is not a valid PK mobile. */
export function normalizePhone(input) {
  if (typeof input !== 'string' || input.length > 32) return null;
  let digits = input.replace(/[\s\-()]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  if (digits.startsWith('03')) digits = '+92' + digits.slice(1);
  else if (digits.startsWith('92')) digits = '+' + digits;
  return PK_MOBILE.test(digits) ? digits : null;
}

/** null when OK, otherwise 'short' | 'long' | 'weak'. */
export function checkPassword(pw) {
  if (typeof pw !== 'string') return 'weak';
  if (pw.length < PASSWORD_MIN) return 'short';
  if (pw.length > PASSWORD_MAX) return 'long';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'weak';
  return null;
}
