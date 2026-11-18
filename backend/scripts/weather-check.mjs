/**
 * Run with:  npm run weather:check   (from the project root or from backend/)
 * Tests each weather provider from THIS machine and prints exactly what fails and why.
 * No database and no running server needed.
 */
import dns from 'node:dns';
import { DISTRICTS, PROVIDERS, describeError, getForecastDetailed } from '../src/services/weather.js';
import { env } from '../src/config/env.js';

dns.setDefaultResultOrder('ipv4first');

const HINTS = {
  enotfound: 'DNS could not find the server. Check your internet connection, turn any VPN off or on, or set your DNS to 1.1.1.1 / 8.8.8.8.',
  eai_again: 'DNS lookup timed out. Check your internet connection or change your DNS to 1.1.1.1 / 8.8.8.8.',
  timeout: 'The connection took too long. A firewall, antivirus, ISP block or very slow network is the usual cause. Try another network (a phone hotspot is a quick test) or a VPN.',
  und_err_connect_timeout: 'Could not connect in time. Same causes as a timeout: firewall, antivirus, ISP block, or IPv6 trouble. Try a phone hotspot.',
  etimedout: 'Could not connect in time. Same causes as a timeout: firewall, antivirus, ISP block, or IPv6 trouble. Try a phone hotspot.',
  econnrefused: 'The connection was refused, which usually means a firewall or proxy is blocking it.',
  econnreset: 'The connection was cut. Usually a firewall, antivirus HTTPS scanning, or an unstable network.',
  unable_to_verify_leaf_signature: 'HTTPS certificate not trusted. Antivirus "HTTPS scanning" or a company proxy is the usual cause.',
  self_signed_cert_in_chain: 'HTTPS certificate not trusted. Antivirus "HTTPS scanning" or a company proxy is the usual cause.',
  http_403: 'The provider refused the request. For MET Norway, set WEATHER_USER_AGENT in backend/.env to something like "AgriLink/1.2 you@example.com".',
  http_429: 'Too many requests from this network. Wait a few minutes; the app caches results to avoid this.',
  bad_payload: 'The provider answered, but not with a forecast we understand.',
  network_error: 'A network error with no detail. Check your internet connection.',
};

const district = process.argv[2] ?? 'multan';
const [lat, lon] = DISTRICTS[district] ?? DISTRICTS.multan;
console.log(`Weather check for "${district}" (${lat}, ${lon}), Node ${process.version}\n`);

async function checkProvider(name) {
  const p = PROVIDERS[name];
  console.log(`${p.label}  (${p.host})`);
  try {
    const addrs = await dns.promises.lookup(p.host, { all: true });
    console.log(`  DNS      ok  ${addrs.map((a) => a.address).join(', ')}`);
  } catch (err) {
    const code = describeError(err);
    console.log(`  DNS      FAILED (${code})\n  Hint: ${HINTS[code] ?? HINTS.network_error}\n`);
    return false;
  }
  const { url, headers } = p.request(lat, lon, env.weatherUserAgent);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers });
    const ms = Date.now() - started;
    if (!res.ok) {
      const code = `http_${res.status}`;
      console.log(`  Request  FAILED (${code}) after ${ms} ms\n  Hint: ${HINTS[code] ?? 'The provider returned an error status.'}\n`);
      return false;
    }
    const json = await res.json();
    const { items, current } = p.parse(json, 'en');
    const today = items[0];
    console.log(`  Request  ok  ${ms} ms, ${items.length} days`);
    if (current) console.log(`  Now      ${current.temp}°C, ${current.condition}`);
    console.log(`  Today    high ${today.tempMax}°C / low ${today.tempMin}°C, ${today.condition}, rain chance ${today.rainProbPercent ?? 'n/a'}%\n`);
    return true;
  } catch (err) {
    const code = describeError(err);
    console.log(`  Request  FAILED (${code}) after ${Date.now() - started} ms\n  Hint: ${HINTS[code] ?? HINTS.network_error}\n`);
    return false;
  }
}

const results = {};
for (const name of Object.keys(PROVIDERS)) results[name] = await checkProvider(name);

const working = Object.keys(results).filter((n) => results[n]);
if (working.length === 0) {
  console.log('RESULT: no weather provider is reachable from this machine, so the weather page will show "not available".');
  console.log('Fix the network problem described above, then run this command again.');
  process.exit(1);
}
const live = await getForecastDetailed(district, 'en', { providers: env.weatherProviders, userAgent: env.weatherUserAgent, log: () => {} });
console.log(`RESULT: ${working.length} of ${Object.keys(results).length} providers work. The app will use "${live.source}" (providers tried in order: ${env.weatherProviders.join(', ')}).`);
