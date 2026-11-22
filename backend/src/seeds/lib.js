import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dayLabel, todayISO } from '../utils/validate.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const DAY = 86_400_000;

export const loadSeedData = () => JSON.parse(fs.readFileSync(path.join(dir, 'seed-data.json'), 'utf8'));

/** Days between the day the sample data was written and today, so sample dates always look fresh. */
export function dayDelta(data, now = new Date()) {
  const ref = Date.parse(`${data.referenceDay}T00:00:00Z`);
  const today = Date.parse(`${todayISO(now)}T00:00:00Z`);
  return Math.round((today - ref) / DAY);
}

export const shiftDate = (iso, delta) => new Date(Date.parse(`${iso}T00:00:00Z`) + delta * DAY).toISOString().slice(0, 10);
export const shiftDateTime = (iso, delta) => new Date(Date.parse(iso) + delta * DAY).toISOString();

export function buildPrices(data, now = new Date()) {
  return data.prices.map(({ id, historicalPrices, ...p }) => ({
    ...p,
    historicalPrices: historicalPrices.map((h, i) => ({
      date: dayLabel(new Date(now.getTime() - (historicalPrices.length - 1 - i) * DAY)),
      price: h.price,
    })),
    lastUpdated: now.toISOString(),
  }));
}

export function buildArticles(data, delta) {
  return data.articles.map(({ id, publishedDate, ...a }) => ({
    ...a,
    publishedDate: shiftDateTime(`${publishedDate}T09:00:00Z`, delta),
  }));
}
