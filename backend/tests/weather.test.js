import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdvisory,
  clearWeatherCache,
  conditionFromSymbol,
  describeError,
  getForecast,
  getForecastDetailed,
  mapCondition,
  normalizeDistrict,
  parseMetNorway,
  parseMetNorwayCurrent,
  parseOpenMeteo,
  parseOpenMeteoCurrent,
} from '../src/services/weather.js';

beforeEach(() => clearWeatherCache());

const sample = () => ({
  daily: {
    time: ['2026-11-11', '2026-11-12'],
    weather_code: [0, 95],
    temperature_2m_max: [28.6, 24.2],
    temperature_2m_min: [15.1, 13.9],
    precipitation_probability_max: [5, null],
    precipitation_sum: [0, 22],
    wind_speed_10m_max: [9.4, 30.2],
  },
  hourly: {
    time: ['2026-11-11T00:00', '2026-11-11T01:00', '2026-11-12T00:00'],
    relative_humidity_2m: [40, 50, 80],
  },
});

test('normalizeDistrict handles bilingual names and unknowns', () => {
  assert.equal(normalizeDistrict('Multan (ملتان)'), 'multan');
  assert.equal(normalizeDistrict('  LAHORE '), 'lahore');
  assert.equal(normalizeDistrict('Rahim  Yar Khan'), 'rahim yar khan');
  assert.equal(normalizeDistrict('Atlantis'), 'multan');
  assert.equal(normalizeDistrict('__proto__'), 'multan');
  assert.equal(normalizeDistrict(undefined), 'multan');
});

test('mapCondition maps WMO codes to the five UI conditions', () => {
  assert.equal(mapCondition(0), 'Sunny');
  assert.equal(mapCondition(2), 'Partly Cloudy');
  assert.equal(mapCondition(3), 'Overcast');
  assert.equal(mapCondition(61), 'Scattered Showers');
  assert.equal(mapCondition(65), 'Heavy Rain');
  assert.equal(mapCondition(96), 'Heavy Rain');
  assert.equal(mapCondition(3, 20), 'Heavy Rain');
});

test('parseOpenMeteo returns the exact WeatherDay shape', () => {
  const days = parseOpenMeteo(sample());
  assert.equal(days.length, 2);
  assert.deepEqual(Object.keys(days[0]).sort(), [
    'advisory', 'condition', 'date', 'humidityPercent', 'rainProbPercent', 'tempMax', 'tempMin', 'windSpeedKmh',
  ]);
  assert.equal(days[0].tempMax, 29);
  assert.equal(days[0].humidityPercent, 45);
  assert.equal(days[0].condition, 'Sunny');
  assert.equal(days[1].condition, 'Heavy Rain');
  assert.equal(days[1].rainProbPercent, null); // no probability from the provider stays null, never a made-up 0%
  assert.throws(() => parseOpenMeteo({}), /weather_bad_payload/);
});

test('advisory follows the weather and honours language', () => {
  const calm = { condition: 'Sunny', rainProbPercent: 5, windSpeedKmh: 8, tempMax: 28, tempMin: 15 };
  assert.match(buildAdvisory(calm, 'en'), /good day for spraying/);
  assert.match(buildAdvisory({ ...calm, windSpeedKmh: 30 }, 'en'), /Do not spray/);
  assert.match(buildAdvisory({ ...calm, tempMax: 41 }, 'en'), /hot/);
  assert.match(buildAdvisory({ ...calm, tempMin: 2 }, 'en'), /Frost/);
  assert.match(buildAdvisory({ ...calm, condition: 'Heavy Rain' }, 'en'), /Heavy rain/);
  assert.match(buildAdvisory(calm, 'ur'), /[\u0600-\u06FF]/); // Urdu by default
});

test('getForecast caches, then serves stale data if the provider fails, and never throws', async () => {
  let calls = 0;
  const ok = async () => {
    calls++;
    return { ok: true, json: async () => sample() };
  };
  const down = async () => {
    throw new Error('network down');
  };
  const t0 = 1_000_000;

  const first = await getForecast('Multan', 'ur', { fetchImpl: ok, now: t0, ttlMs: 60_000 });
  const cached = await getForecast('Multan', 'ur', { fetchImpl: ok, now: t0 + 1000, ttlMs: 60_000 });
  assert.equal(calls, 1);
  assert.deepEqual(first, cached);

  const stale = await getForecast('Multan', 'ur', { fetchImpl: down, now: t0 + 120_000, ttlMs: 60_000, retryDelayMs: 0, log: () => {} });
  assert.deepEqual(stale, first);

  const none = await getForecast('Okara', 'ur', { fetchImpl: down, now: t0, ttlMs: 60_000, retryDelayMs: 0, log: () => {} });
  assert.deepEqual(none, []);

  const bad = await getForecast('Lahore', 'ur', { fetchImpl: async () => ({ ok: false, status: 500 }), now: t0, retryDelayMs: 0, log: () => {} });
  assert.deepEqual(bad, []);
});

test('resolveDistrict reports whether the name was recognised', async () => {
  const { resolveDistrict, listDistricts, DISTRICTS } = await import('../src/services/weather.js');
  assert.deepEqual(resolveDistrict('Lahore (لاہور)'), { key: 'lahore', matched: true });
  assert.deepEqual(resolveDistrict('  RAHIM   YAR KHAN '), { key: 'rahim yar khan', matched: true });
  assert.deepEqual(resolveDistrict('Gujrat'), { key: 'multan', matched: false });
  assert.deepEqual(resolveDistrict(undefined), { key: 'multan', matched: false });
  assert.deepEqual(resolveDistrict({ $ne: 1 }), { key: 'multan', matched: false });
  assert.deepEqual(resolveDistrict('__proto__'), { key: 'multan', matched: false });

  const list = listDistricts();
  assert.equal(list.length, Object.keys(DISTRICTS).length);
  assert.ok(list.some((d) => d.id === 'dera ghazi khan' && d.name === 'Dera Ghazi Khan'));
  assert.deepEqual(list.map((d) => d.id), [...list.map((d) => d.id)].sort());
});

// ---------------------------------------------------------------- MET Norway + provider chain

// Shaped like api.met.no locationforecast/2.0/complete. Times are UTC; Pakistan is UTC+5.
const metSample = () => ({
  properties: {
    timeseries: [
      {
        time: '2026-11-17T03:00:00Z', // 08:00 PKT on the 17th
        data: {
          instant: { details: { air_temperature: 18.2, relative_humidity: 60, wind_speed: 2 } },
          next_1_hours: { summary: { symbol_code: 'clearsky_day' }, details: { precipitation_amount: 0 } },
          next_6_hours: { summary: { symbol_code: 'clearsky_day' }, details: { precipitation_amount: 0, probability_of_precipitation: 3 } },
        },
      },
      {
        time: '2026-11-17T09:00:00Z', // 14:00 PKT
        data: {
          instant: { details: { air_temperature: 29.6, relative_humidity: 30, wind_speed: 5 } },
          next_1_hours: { summary: { symbol_code: 'fair_day' }, details: { precipitation_amount: 0 } },
          next_6_hours: { summary: { symbol_code: 'fair_day' }, details: { precipitation_amount: 0, probability_of_precipitation: 8 } },
        },
      },
      {
        // 01:00 PKT on the 18th: must land on the 18th, not the 17th
        time: '2026-11-17T20:00:00Z',
        data: {
          instant: { details: { air_temperature: 12.4, relative_humidity: 80, wind_speed: 1 } },
          next_1_hours: { summary: { symbol_code: 'cloudy' }, details: { precipitation_amount: 0 } },
        },
      },
      {
        time: '2026-11-18T06:00:00Z', // 11:00 PKT, 6-hourly tail: only next_6_hours
        data: {
          instant: { details: { air_temperature: 22, relative_humidity: 55, wind_speed: 10 } },
          next_6_hours: { summary: { symbol_code: 'rain' }, details: { precipitation_amount: 4.5, probability_of_precipitation: 70 } },
        },
      },
      {
        time: '2026-11-18T12:00:00Z', // 17:00 PKT
        data: {
          instant: { details: { air_temperature: 20, relative_humidity: 65, wind_speed: 4 } },
          next_6_hours: { summary: { symbol_code: 'lightrainshowers_day' }, details: { precipitation_amount: 1.5, probability_of_precipitation: 55 } },
        },
      },
    ],
  },
});

test('parseMetNorway groups by Pakistan day and converts units', () => {
  const days = parseMetNorway(metSample(), 'en');
  assert.deepEqual(days.map((d) => d.date), ['2026-11-17', '2026-11-18']);
  const [d17, d18] = days;
  assert.equal(d17.tempMax, 30);
  assert.equal(d17.tempMin, 18);
  assert.equal(d17.windSpeedKmh, 18); // 5 m/s = 18 km/h
  assert.equal(d17.rainProbPercent, 8);
  assert.equal(d17.condition, 'Sunny');
  assert.equal(d17.humidityPercent, 45);
  // the 01:00 PKT reading belongs to the 18th
  assert.equal(d18.tempMin, 12);
  assert.equal(d18.condition, 'Scattered Showers'); // 6 mm total
  assert.equal(d18.rainProbPercent, 70);
  assert.match(d18.advisory, /Rain is likely/);
});

test('parseMetNorway rejects junk and parseMetNorwayCurrent reads the first reading', () => {
  assert.throws(() => parseMetNorway({}), /weather_bad_payload/);
  assert.throws(() => parseMetNorway({ properties: { timeseries: [] } }), /weather_bad_payload/);
  assert.deepEqual(parseMetNorwayCurrent(metSample()), { temp: 18, humidityPercent: 60, windSpeedKmh: 7, condition: 'Sunny' });
  assert.equal(parseMetNorwayCurrent({}), null);
});

test('symbol codes map onto the five conditions', () => {
  assert.equal(conditionFromSymbol('clearsky_night'), 'Sunny');
  assert.equal(conditionFromSymbol('partlycloudy_day'), 'Partly Cloudy');
  assert.equal(conditionFromSymbol('fog'), 'Overcast');
  assert.equal(conditionFromSymbol('lightrain'), 'Scattered Showers');
  assert.equal(conditionFromSymbol('heavyrainshowers_day'), 'Heavy Rain');
  assert.equal(conditionFromSymbol('rainandthunder'), 'Heavy Rain');
  assert.equal(conditionFromSymbol(undefined), 'Overcast');
});

test('a missing rain probability stays null instead of becoming 0%', () => {
  const j = sample();
  delete j.daily.precipitation_probability_max;
  assert.equal(parseOpenMeteo(j)[0].rainProbPercent, null);
});

test('parseOpenMeteoCurrent reads the current block', () => {
  const now = parseOpenMeteoCurrent({ current: { temperature_2m: 27.6, relative_humidity_2m: 41, weather_code: 2, wind_speed_10m: 11.2 } });
  assert.deepEqual(now, { temp: 28, humidityPercent: 41, windSpeedKmh: 11, condition: 'Partly Cloudy' });
  assert.equal(parseOpenMeteoCurrent({}), null);
});

test('describeError gives short safe codes', () => {
  assert.equal(describeError(Object.assign(new Error('x'), { name: 'TimeoutError' })), 'timeout');
  assert.equal(describeError(new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } })), 'enotfound');
  assert.equal(describeError(new TypeError('fetch failed', { cause: { errors: [{ code: 'ETIMEDOUT' }] } })), 'etimedout');
  assert.equal(describeError(new Error('weather_bad_payload')), 'bad_payload');
  assert.equal(describeError(new Error('boom')), 'network_error');
});

test('falls back to MET Norway when Open-Meteo is unreachable, sending a User-Agent and 4-decimal coordinates', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, headers: init.headers });
    if (url.includes('open-meteo')) throw new TypeError('fetch failed', { cause: { code: 'ETIMEDOUT' } });
    return { ok: true, json: async () => metSample() };
  };
  const r = await getForecastDetailed('Multan', 'en', {
    fetchImpl, retryDelayMs: 0, log: () => {}, userAgent: 'AgriLink/1.2 test@example.com',
  });
  assert.equal(r.source, 'met-no');
  assert.equal(r.stale, false);
  assert.equal(r.items.length, 2);
  assert.deepEqual(r.errors, [{ provider: 'open-meteo', reason: 'etimedout' }]);
  const met = seen.find((c) => c.url.includes('met.no'));
  assert.equal(met.headers['User-Agent'], 'AgriLink/1.2 test@example.com');
  assert.match(met.url, /lat=30\.1575&lon=71\.5249/);
  assert.equal(seen.filter((c) => c.url.includes('open-meteo')).length, 2); // first try + one retry
});

test('a 4xx is not retried, and when every provider fails the result is empty with reasons', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return { ok: false, status: 403 };
  };
  const r = await getForecastDetailed('Okara', 'ur', { fetchImpl, retryDelayMs: 0, log: () => {} });
  assert.equal(calls, 2); // one attempt per provider, no retries on 403
  assert.deepEqual(r.items, []);
  assert.equal(r.source, null);
  assert.deepEqual(r.errors.map((e) => e.reason), ['http_403', 'http_403']);
});

test('a stale copy is served and flagged when every provider fails', async () => {
  const ok = async () => ({ ok: true, json: async () => sample() });
  const down = async () => { throw new Error('down'); };
  const t0 = 5_000_000;
  const fresh = await getForecastDetailed('Lahore', 'en', { fetchImpl: ok, now: t0, ttlMs: 1000 });
  assert.equal(fresh.source, 'open-meteo');
  const stale = await getForecastDetailed('Lahore', 'en', { fetchImpl: down, now: t0 + 60_000, ttlMs: 1000, retryDelayMs: 0, log: () => {} });
  assert.equal(stale.stale, true);
  assert.equal(stale.updatedAt, t0);
  assert.deepEqual(stale.items, fresh.items);
});

test('the providers option controls which sources are tried', async () => {
  const urls = [];
  const fetchImpl = async (url) => { urls.push(url); return { ok: true, json: async () => metSample() }; };
  const r = await getForecastDetailed('Jhelum', 'en', { fetchImpl, providers: ['met-no'] });
  assert.equal(r.source, 'met-no');
  assert.equal(urls.length, 1);
  assert.ok(urls[0].includes('met.no'));
});
