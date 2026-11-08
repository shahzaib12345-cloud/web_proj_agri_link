import type { Language } from '@/i18n/I18nContext';

/** Prices use Latin digits with thousands separators in both languages. */
const NUM = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 });

export function formatNumber(n: number): string {
  return NUM.format(n);
}

const locale = (lang: Language) => (lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK');

export function formatDate(iso: string, lang: Language): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(iso: string, lang: Language): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatWeekday(iso: string, lang: Language): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale(lang), { weekday: 'short' }).format(d);
}

export function formatShortDate(iso: string, lang: Language): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short' }).format(d);
}
