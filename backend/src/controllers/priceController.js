import { MarketPrice } from '../models/MarketPrice.js';
import { PriceAlert } from '../models/PriceAlert.js';
import { createError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { LIMITS } from '../constants/limits.js';
import { UNITS } from '../constants/enums.js';
import { dayLabel, inRange, isPlainObject, num, str, todayISO } from '../utils/validate.js';

const MAX_ALERTS_PER_USER = 50;
const bodyOf = (req) => (isPlainObject(req.body) ? req.body : {});

export const getPrices = asyncHandler(async (_req, res) => {
  const prices = await MarketPrice.find().sort({ cropName: 1, region: 1 });
  res.json({ items: prices.map((p) => p.toJSON()) });
});

/** Admin: add a crop/market row to the price board. */
export const createPrice = asyncHandler(async (req, res) => {
  const b = bodyOf(req);
  const cropName = str(b.cropName, 120);
  const marketName = str(b.marketName, 120);
  const region = str(b.region, LIMITS.textShort);
  if (!cropName || !marketName || !region) throw createError(400, 'invalid_text');
  if (typeof b.unit !== 'string' || !UNITS.includes(b.unit)) throw createError(400, 'invalid_unit');
  const wholesale = num(b.wholesalePrice);
  const retail = num(b.retailPrice);
  if (!inRange(wholesale, LIMITS.price.min, LIMITS.price.max) || !inRange(retail, LIMITS.price.min, LIMITS.price.max)) {
    throw createError(400, 'invalid_price');
  }
  const now = new Date();
  const price = await MarketPrice.create({
    cropName,
    marketName,
    region,
    unit: b.unit,
    currency: 'PKR',
    wholesalePrice: wholesale,
    retailPrice: retail,
    trend: 'stable',
    changePercent: 0,
    historicalPrices: [{ date: dayLabel(now), price: wholesale }],
    lastUpdated: now.toISOString(),
  });
  res.status(201).json(price.toJSON());
});

export const updatePrice = asyncHandler(async (req, res) => {
  const b = bodyOf(req);
  const wholesale = num(b.wholesalePrice);
  const retail = num(b.retailPrice);
  if (!inRange(wholesale, LIMITS.price.min, LIMITS.price.max) || !inRange(retail, LIMITS.price.min, LIMITS.price.max)) {
    throw createError(400, 'invalid_price');
  }
  const p = await MarketPrice.findById(req.params.id);
  if (!p) throw createError(404, 'not_found');

  const diff = wholesale - p.wholesalePrice;
  p.changePercent = p.wholesalePrice > 0 ? Number(((diff / p.wholesalePrice) * 100).toFixed(1)) : 0;
  p.trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';

  const now = new Date();
  const label = dayLabel(now);
  const last = p.historicalPrices[p.historicalPrices.length - 1];
  if (last?.date === label) {
    last.price = wholesale;
  } else {
    p.historicalPrices.push({ date: label, price: wholesale });
    while (p.historicalPrices.length > 10) p.historicalPrices.shift();
  }
  p.wholesalePrice = wholesale;
  p.retailPrice = retail;
  p.lastUpdated = now.toISOString();
  await p.save();
  res.json(p.toJSON());
});

export const deletePrice = asyncHandler(async (req, res) => {
  const p = await MarketPrice.findByIdAndDelete(req.params.id);
  if (!p) throw createError(404, 'not_found');
  res.status(204).end();
});

export const getPriceAlerts = asyncHandler(async (req, res) => {
  const [alerts, prices] = await Promise.all([
    PriceAlert.find({ userId: req.user._id }).sort({ _id: -1 }),
    MarketPrice.find().select('cropName wholesalePrice').lean(),
  ]);
  const items = alerts.map((a) => {
    const json = a.toJSON();
    json.isTriggered = prices.some(
      (p) =>
        p.cropName === a.cropName &&
        (a.condition === 'above' ? p.wholesalePrice >= a.targetPrice : p.wholesalePrice <= a.targetPrice),
    );
    return json;
  });
  res.json({ items });
});

export const createPriceAlert = asyncHandler(async (req, res) => {
  const b = bodyOf(req);
  const target = num(b.targetPrice);
  const cropName = typeof b.cropName === 'string' ? b.cropName : '';
  if (!inRange(target, LIMITS.price.min, LIMITS.price.max)) throw createError(400, 'invalid_price');
  if (b.condition !== 'above' && b.condition !== 'below') throw createError(400, 'invalid_condition');
  if (!cropName || !(await MarketPrice.exists({ cropName }))) throw createError(400, 'invalid_crop');
  if ((await PriceAlert.countDocuments({ userId: req.user._id })) >= MAX_ALERTS_PER_USER) {
    throw createError(409, 'too_many_alerts');
  }
  const alert = await PriceAlert.create({
    userId: req.user._id,
    cropName,
    targetPrice: target,
    condition: b.condition,
    isTriggered: false,
    createdAt: todayISO(),
  });
  res.status(201).json(alert.toJSON());
});

export const deletePriceAlert = asyncHandler(async (req, res) => {
  await PriceAlert.deleteOne({ _id: req.params.id, userId: req.user._id }); // ownership enforced in the filter
  res.status(204).end();
});
