/**
 * Weather proxy. The browser never talks to a provider and no API key is needed.
 * Two free, keyless providers are tried in order (Open-Meteo, then MET Norway), so one being blocked or down
 * on the host's network doesn't take the weather page down. Results are cached per district and language.
 * This file has no framework imports so it can be unit-tested on its own.
 */

// [latitude, longitude] of the main Punjab districts. Names match the first (English) part of the
// district strings the app stores, e.g. "Multan (ملتان)" -> "multan".
export const DISTRICTS = {
  multan: [30.1575, 71.5249],
  okara: [30.8138, 73.4534],
  faisalabad: [31.4504, 73.135],
  lahore: [31.5204, 74.3587],
  sahiwal: [30.6682, 73.1114],
  sargodha: [32.074, 72.6861],
  bahawalpur: [29.3956, 71.6836],
  'rahim yar khan': [28.4202, 70.2952],
  gujranwala: [32.1877, 74.1945],
  sialkot: [32.4945, 74.5229],
  rawalpindi: [33.5651, 73.0169],
  vehari: [30.0453, 72.3489],
  khanewal: [30.3017, 71.9321],
  kasur: [31.1156, 74.4467],
  sheikhupura: [31.7131, 73.9783],
  jhang: [31.2681, 72.3181],
  muzaffargarh: [30.0703, 71.1933],
  'dera ghazi khan': [30.0561, 70.6403],
  bahawalnagar: [29.9984, 73.2536],
  pakpattan: [30.3436, 73.3894],
  lodhran: [29.5309, 71.6324],
  'toba tek singh': [30.9709, 72.4826],
  'mandi bahauddin': [32.5861, 73.4917],
  layyah: [30.9693, 70.9427],
  narowal: [32.1019, 74.873],
  jhelum: [32.9425, 73.7257],
  chiniot: [31.72, 72.9789],
  hafizabad: [32.0709, 73.688],
};
export const DEFAULT_DISTRICT = 'multan';

/**
 * "Multan (ملتان)" | "multan" | "  MULTAN " -> { key: 'multan', matched: true }.
 * A name we have no coordinates for falls back to the default with matched: false, so the UI can say so
 * instead of silently showing another district's weather under the user's district name.
 */
export function resolveDistrict(input) {
  if (typeof input !== 'string') return { key: DEFAULT_DISTRICT, matched: false };
  const name = input.split('(')[0].trim().toLowerCase().replace(/\s+/g, ' ');
  return Object.hasOwn(DISTRICTS, name) ? { key: name, matched: true } : { key: DEFAULT_DISTRICT, matched: false };
}

export const normalizeDistrict = (input) => resolveDistrict(input).key;

const titleCase = (key) => key.replace(/\b\w/g, (c) => c.toUpperCase());

/** Every district we can forecast for, sorted, as { id, name } pairs for the district picker. */
export function listDistricts() {
  return Object.keys(DISTRICTS)
    .sort()
    .map((id) => ({ id, name: titleCase(id) }));
}

/** WMO weather code + rainfall -> the five conditions the UI knows how to draw. */
export function mapCondition(code, precipSumMm = 0) {
  if (code >= 95) return 'Heavy Rain'; // thunderstorm
  if (code === 65 || code === 67 || code === 82 || precipSumMm >= 15) return 'Heavy Rain';
  if ((code >= 51 && code <= 66) || (code >= 80 && code <= 81) || precipSumMm >= 2) return 'Scattered Showers';
  if (code === 0 || code === 1) return 'Sunny';
  if (code === 2) return 'Partly Cloudy';
  return 'Overcast';
}

const ADVICE = {
  heavy: {
    ur: 'تیز بارش یا آندھی طوفان کا امکان ہے۔ کٹی ہوئی فصل اور اناج کو ڈھانپ کر محفوظ جگہ پر رکھیں، سپرے اور کھاد کا استعمال مؤخر کریں۔',
    en: 'Heavy rain or a thunderstorm is likely. Cover harvested crops and grain in a safe place, and postpone spraying and fertilizer.',
  },
  rain: {
    ur: 'بارش کا امکان ہے۔ سپرے اور کھاد ڈالنے سے گریز کریں اور منڈی لے جانے والی فصل کو ڈھانپ کر رکھیں۔',
    en: 'Rain is likely. Avoid spraying and fertilizer, and keep produce headed to the mandi covered.',
  },
  wind: {
    ur: 'تیز ہوا چلنے کا امکان ہے۔ سپرے نہ کریں، کیونکہ دوا ہوا کے ساتھ ضائع ہو جائے گی۔',
    en: 'Strong wind is expected. Do not spray; the chemical will drift and be wasted.',
  },
  heat: {
    ur: 'شدید گرمی متوقع ہے۔ آبپاشی صبح سویرے یا شام کو کریں اور سبزیوں کو گرمی کے دباؤ سے بچائیں۔',
    en: 'Very hot weather is expected. Irrigate early morning or evening and protect vegetables from heat stress.',
  },
  frost: {
    ur: 'پالے کا خطرہ ہے۔ سبزیوں اور آلو کی فصل کو رات کے وقت ہلکی آبپاشی یا ڈھانپ کر محفوظ کریں۔',
    en: 'Frost is possible. Protect vegetables and potato crops overnight with light irrigation or covers.',
  },
  good: {
    ur: 'موسم صاف اور خشک رہے گا۔ سپرے، کھاد ڈالنے اور کھیت کے کاموں کے لیے موزوں دن ہے۔',
    en: 'Dry, settled weather. A good day for spraying, fertilizer and field work.',
  },
};

export function buildAdvisory(day, lang = 'ur') {
  const l = lang === 'en' ? 'en' : 'ur';
  let key = 'good';
  if (day.condition === 'Heavy Rain') key = 'heavy';
  else if (day.rainProbPercent >= 50 || day.condition === 'Scattered Showers') key = 'rain';
  else if (day.windSpeedKmh >= 25) key = 'wind';
  else if (day.tempMax >= 38) key = 'heat';
  else if (day.tempMin <= 4) key = 'frost';
  return ADVICE[key][l];
}

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

/* ------------------------------------------------------------------ Open-Meteo */

/** Open-Meteo response -> WeatherDay[] (the exact shape the frontend renders). */
export function parseOpenMeteo(json, lang = 'ur') {
  const d = json?.daily;
  if (!d || !Array.isArray(d.time) || d.time.length === 0) throw new Error('weather_bad_payload');

  const humidity = new Map(); // date -> [sum, count] from hourly values
  const h = json.hourly;
  if (h && Array.isArray(h.time) && Array.isArray(h.relative_humidity_2m)) {
    h.time.forEach((t, i) => {
      const v = h.relative_humidity_2m[i];
      if (!finite(v)) return;
      const date = String(t).slice(0, 10);
      const cur = humidity.get(date) ?? [0, 0];
      humidity.set(date, [cur[0] + v, cur[1] + 1]);
    });
  }

  const n = (arr, i, fallback = 0) => (Array.isArray(arr) && finite(arr[i]) ? arr[i] : fallback);
  return d.time.map((date, i) => {
    const [sum, count] = humidity.get(date) ?? [0, 0];
    const prob = Array.isArray(d.precipitation_probability_max) ? d.precipitation_probability_max[i] : null;
    const day = {
      date,
      tempMax: Math.round(n(d.temperature_2m_max, i)),
      tempMin: Math.round(n(d.temperature_2m_min, i)),
      condition: mapCondition(n(d.weather_code, i), n(d.precipitation_sum, i)),
      // null = the model gave no probability for that day. Showing 0% would claim "it won't rain".
      rainProbPercent: finite(prob) ? Math.round(prob) : null,
      humidityPercent: count ? Math.round(sum / count) : 0,
      windSpeedKmh: Math.round(n(d.wind_speed_10m_max, i)),
    };
    return { ...day, advisory: buildAdvisory(day, lang) };
  });
}

/** Conditions right now, from Open-Meteo's `current` block. null when the block is missing. */
export function parseOpenMeteoCurrent(json) {
  const c = json?.current;
  if (!c || !finite(c.temperature_2m)) return null;
  return {
    temp: Math.round(c.temperature_2m),
    humidityPercent: finite(c.relative_humidity_2m) ? Math.round(c.relative_humidity_2m) : null,
    windSpeedKmh: finite(c.wind_speed_10m) ? Math.round(c.wind_speed_10m) : null,
    condition: mapCondition(finite(c.weather_code) ? c.weather_code : 3, 0),
  };
}

/* ------------------------------------------------------------------ MET Norway */

const PKT_OFFSET_MS = 5 * 3600 * 1000; // Pakistan Standard Time is UTC+5 all year (no daylight saving)

/** MET Norway symbol_code ("lightrainshowers_day", "clearsky_night", ...) -> one of the five UI conditions. */
export function conditionFromSymbol(code) {
  const base = String(code ?? '').replace(/_(day|night|polartwilight)$/, '');
  if (base.includes('thunder') || base.startsWith('heavyrain')) return 'Heavy Rain';
  if (/(rain|sleet|snow|shower)/.test(base)) return 'Scattered Showers';
  if (base === 'clearsky' || base === 'fair') return 'Sunny';
  if (base === 'partlycloudy') return 'Partly Cloudy';
  return 'Overcast'; // cloudy, fog, anything unknown
}

/**
 * MET Norway locationforecast (hourly for ~2.5 days, then 6-hourly) -> the same WeatherDay[] shape.
 * Entries are grouped into Pakistan calendar days. Today only covers the hours still ahead, so its high can be
 * a little lower than the true daily high; Open-Meteo, the first choice, covers the whole day.
 */
export function parseMetNorway(json, lang = 'ur') {
  const series = json?.properties?.timeseries;
  if (!Array.isArray(series) || series.length === 0) throw new Error('weather_bad_payload');

  const days = new Map();
  for (const entry of series) {
    const t = Date.parse(entry?.time);
    if (!Number.isFinite(t)) continue;
    const local = new Date(t + PKT_OFFSET_MS);
    const date = local.toISOString().slice(0, 10);
    const hour = local.getUTCHours();

    const acc = days.get(date) ?? { temps: [], humidity: [], wind: [], precip: 0, probs: [], symbols: [] };
    const inst = entry?.data?.instant?.details ?? {};
    if (finite(inst.air_temperature)) acc.temps.push(inst.air_temperature);
    if (finite(inst.relative_humidity)) acc.humidity.push(inst.relative_humidity);
    if (finite(inst.wind_speed)) acc.wind.push(inst.wind_speed * 3.6); // m/s -> km/h

    const next1 = entry?.data?.next_1_hours;
    const next6 = entry?.data?.next_6_hours;
    // Use the hourly block when present, otherwise the 6-hour one. Using both would count rain twice.
    const amount = (next1 ?? next6)?.details?.precipitation_amount;
    if (finite(amount)) acc.precip += amount;
    for (const block of [next1, next6, entry?.data?.next_12_hours]) {
      const p = block?.details?.probability_of_precipitation;
      if (finite(p)) acc.probs.push(p);
    }
    const symbol = (next1 ?? next6)?.summary?.symbol_code;
    if (symbol && hour >= 6 && hour <= 20) acc.symbols.push(symbol); // daytime hours describe the day
    days.set(date, acc);
  }

  const dates = [...days.keys()].sort().filter((d) => days.get(d).temps.length > 0).slice(0, 7);
  if (dates.length === 0) throw new Error('weather_bad_payload');

  return dates.map((date) => {
    const a = days.get(date);
    const conditions = a.symbols.map(conditionFromSymbol);
    const count = (c) => conditions.filter((x) => x === c).length;
    let condition;
    if (conditions.includes('Heavy Rain') || a.precip >= 15) condition = 'Heavy Rain';
    else if (a.precip >= 2 || count('Scattered Showers') >= 2) condition = 'Scattered Showers';
    else {
      const calm = ['Sunny', 'Partly Cloudy', 'Overcast'];
      condition = calm.reduce((best, c) => (count(c) > count(best) ? c : best), 'Sunny');
      if (conditions.length === 0) condition = 'Overcast';
    }
    const mean = (xs) => xs.reduce((x, y) => x + y, 0) / xs.length;
    const day = {
      date,
      tempMax: Math.round(Math.max(...a.temps)),
      tempMin: Math.round(Math.min(...a.temps)),
      condition,
      rainProbPercent: a.probs.length ? Math.round(Math.max(...a.probs)) : null,
      humidityPercent: a.humidity.length ? Math.round(mean(a.humidity)) : 0,
      windSpeedKmh: a.wind.length ? Math.round(Math.max(...a.wind)) : 0,
    };
    return { ...day, advisory: buildAdvisory(day, lang) };
  });
}

export function parseMetNorwayCurrent(json) {
  const first = json?.properties?.timeseries?.[0]?.data;
  const inst = first?.instant?.details;
  if (!inst || !finite(inst.air_temperature)) return null;
  const symbol = (first.next_1_hours ?? first.next_6_hours)?.summary?.symbol_code;
  return {
    temp: Math.round(inst.air_temperature),
    humidityPercent: finite(inst.relative_humidity) ? Math.round(inst.relative_humidity) : null,
    windSpeedKmh: finite(inst.wind_speed) ? Math.round(inst.wind_speed * 3.6) : null,
    condition: conditionFromSymbol(symbol),
  };
}

/* ------------------------------------------------------------------ provider chain */

export const PROVIDERS = {
  'open-meteo': {
    label: 'Open-Meteo',
    host: 'api.open-meteo.com',
    request: (lat, lon) => ({
      url:
        'https://api.open-meteo.com/v1/forecast' +
        `?latitude=${lat}&longitude=${lon}` +
        '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max' +
        '&hourly=relative_humidity_2m&timezone=Asia%2FKarachi&forecast_days=7&wind_speed_unit=kmh',
      headers: { Accept: 'application/json' },
    }),
    parse: (json, lang) => ({ items: parseOpenMeteo(json, lang), current: parseOpenMeteoCurrent(json) }),
  },
  'met-no': {
    label: 'MET Norway',
    host: 'api.met.no',
    // MET Norway rejects coordinates with more than 4 decimals and requires a User-Agent naming the app.
    request: (lat, lon, userAgent) => ({
      url: `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
      headers: { Accept: 'application/json', 'User-Agent': userAgent },
    }),
    parse: (json, lang) => ({ items: parseMetNorway(json, lang), current: parseMetNorwayCurrent(json) }),
  },
};
export const KNOWN_PROVIDERS = Object.keys(PROVIDERS);
export const DEFAULT_USER_AGENT = 'AgriLink/1.2 (university project)';

/** Turns any failure into a short, safe code such as "timeout", "enotfound" or "http_429". */
export function describeError(err) {
  if (typeof err?.reason === 'string') return err.reason;
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'timeout';
  if (typeof err?.message === 'string' && err.message.startsWith('weather_bad_payload')) return 'bad_payload';
  const code = err?.cause?.code || err?.cause?.errors?.[0]?.code || err?.code;
  return typeof code === 'string' ? code.toLowerCase() : 'network_error';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJsonWithRetry(url, headers, { fetchImpl, timeoutMs, retries, retryDelayMs }) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers });
      if (!res.ok) {
        const err = new Error(`http_${res.status}`);
        err.reason = `http_${res.status}`;
        // A 4xx (other than "slow down") won't fix itself on a second try; a 5xx or 429 might.
        err.retryable = res.status >= 500 || res.status === 429;
        throw err;
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (err.retryable === false || attempt === retries) break;
      if (retryDelayMs > 0) await sleep(retryDelayMs);
    }
  }
  throw lastErr;
}

const cache = new Map(); // `${district}:${lang}` -> { at, data: { items, current, source } }
export const clearWeatherCache = () => cache.clear();

/**
 * Forecast + current conditions for a district. Tries each provider in order, retries a flaky one once, serves a
 * stale cache entry if every provider fails, and never throws. `errors` lists why each provider failed.
 */
export async function getForecastDetailed(districtInput, lang = 'ur', opts = {}) {
  const {
    fetchImpl = fetch,
    ttlMs = 30 * 60 * 1000,
    now = Date.now(),
    timeoutMs = 10_000,
    retries = 1,
    retryDelayMs = 300,
    providers = ['open-meteo', 'met-no'],
    userAgent = DEFAULT_USER_AGENT,
    log = console.warn,
  } = opts;

  const district = normalizeDistrict(districtInput);
  const key = `${district}:${lang === 'en' ? 'en' : 'ur'}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return { ...hit.data, stale: false, updatedAt: hit.at, errors: [] };

  const [lat, lon] = DISTRICTS[district];
  const errors = [];
  for (const name of providers) {
    const provider = PROVIDERS[name];
    if (!provider) continue;
    try {
      const { url, headers } = provider.request(lat, lon, userAgent);
      const json = await fetchJsonWithRetry(url, headers, { fetchImpl, timeoutMs, retries, retryDelayMs });
      const { items, current } = provider.parse(json, lang);
      const data = { items, current, source: name };
      cache.set(key, { at: now, data });
      return { ...data, stale: false, updatedAt: now, errors };
    } catch (err) {
      const reason = describeError(err);
      errors.push({ provider: name, reason });
      log(`Weather provider ${name} failed (${reason}).`);
    }
  }

  if (hit) return { ...hit.data, stale: true, updatedAt: hit.at, errors };
  return { items: [], current: null, source: null, stale: false, updatedAt: null, errors };
}

/** Just the 7-day list. Kept for callers that don't need the extra detail. */
export async function getForecast(districtInput, lang = 'ur', opts = {}) {
  return (await getForecastDetailed(districtInput, lang, opts)).items;
}
