import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getForecastDetailed, listDistricts, resolveDistrict } from '../services/weather.js';

export const getWeatherForecast = asyncHandler(async (req, res) => {
  const requested = typeof req.query.district === 'string' ? req.query.district.slice(0, 80) : undefined;
  const lang = req.query.lang === 'en' ? 'en' : 'ur';
  const { key, matched } = resolveDistrict(requested);
  const result = await getForecastDetailed(key, lang, {
    ttlMs: env.weatherCacheMinutes * 60_000,
    providers: env.weatherProviders,
    userAgent: env.weatherUserAgent,
  });
  res.json({
    district: key, // the place the forecast is really for
    matched, // false when the requested name wasn't recognised and the default district was used
    items: result.items,
    current: result.current, // conditions right now (null if the provider didn't send them)
    source: result.source, // 'open-meteo' | 'met-no' | null when nothing could be fetched
    stale: result.stale, // true when this is an older saved copy because every provider failed
    updatedAt: result.updatedAt ? new Date(result.updatedAt).toISOString() : null,
  });
});

export const getWeatherDistricts = asyncHandler(async (_req, res) => {
  res.json({ items: listDistricts() });
});
