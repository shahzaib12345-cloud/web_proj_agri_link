// End-to-end smoke test against a RUNNING API that has the demo data loaded (`npm run seed`).
//   API_URL=http://localhost:5000/api/v1 npm run smoke
// It exercises auth, roles, the full offer lifecycle, privacy rules, admin tools and input hardening,
// then cleans up after itself. Exit code 1 if anything fails.
const BASE = (process.env.API_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
const PASSWORD = 'Demo@1234';
const PHONES = { farmer: '+923001234567', farmer2: '+923019876543', buyer: '+923214567890', admin: '+923000000001' };

let passed = 0;
let failed = 0;
function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

async function call(method, path, { token, body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  const setCookie = res.headers.getSetCookie?.().find((c) => c.startsWith('agrilink_rt=')) ?? null;
  return { status: res.status, json, cookie: setCookie ? setCookie.split(';')[0] : null, raw: setCookie };
}

const login = async (phone) => {
  const r = await call('POST', '/auth/login', { body: { phone, password: PASSWORD } });
  if (r.status !== 200) throw new Error(`login failed for ${phone}: ${r.status} ${JSON.stringify(r.json)}`);
  return { token: r.json.accessToken, user: r.json.user, cookie: r.cookie, raw: r.raw };
};

const pkDay = (offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(Date.now() + offsetDays * 86_400_000));
const todayPK = pkDay();

async function main() {
  console.log(`Smoke test against ${BASE}\n`);

  console.log('Basics');
  const health = await call('GET', '/health');
  check('health is ok', health.status === 200 && health.json?.status === 'ok');
  const pub = await call('GET', '/listings');
  check('public listings load', pub.status === 200 && pub.json.items.length > 0);
  check('public listings never expose phone numbers', !/\+92\d{10}/.test(JSON.stringify(pub.json)));
  const prices = await call('GET', '/prices');
  check('prices load', prices.status === 200 && prices.json.items.length > 0);
  const art = await call('GET', '/articles');
  check('articles load', art.status === 200 && Array.isArray(art.json.items));
  const wx = await call('GET', '/weather?district=Multan');
  check('weather endpoint answers (empty list is fine offline)', wx.status === 200 && Array.isArray(wx.json.items));
  const nf = await call('GET', '/nope');
  check('unknown route gives JSON 404', nf.status === 404 && nf.json?.code === 'not_found');

  console.log('Authentication');
  const bad = await call('POST', '/auth/login', { body: { phone: PHONES.farmer, password: 'Wrong@1234' } });
  const unknown = await call('POST', '/auth/login', { body: { phone: '+923999999999', password: 'Wrong@1234' } });
  check('wrong password -> invalid_credentials', bad.status === 401 && bad.json?.code === 'invalid_credentials');
  check('unknown phone gives the identical error', unknown.status === 401 && unknown.json?.code === 'invalid_credentials');
  const inj = await call('POST', '/auth/login', { body: { phone: { $ne: null }, password: { $ne: null } } });
  check('operator injection rejected', inj.status === 400 && inj.json?.code === 'invalid_body');
  const adminReg = await call('POST', '/auth/register', {
    body: { phone: '+923451112223', password: 'Test@12345', name: 'Hacker', role: 'admin', district: 'Multan', tehsil: 'Multan' },
  });
  check('cannot self-register as admin', adminReg.status === 400 && adminReg.json?.code === 'invalid_role');

  const farmer = await login(PHONES.farmer);
  const farmer2 = await login(PHONES.farmer2);
  const buyer = await login(PHONES.buyer);
  const admin = await login(PHONES.admin);
  check('refresh cookie is httpOnly', /httponly/i.test(farmer.raw ?? ''));
  check('login response has no password', !JSON.stringify(farmer.user).toLowerCase().includes('password'));
  const me = await call('GET', '/auth/me', { token: farmer.token });
  check('/auth/me returns the farmer', me.status === 200 && me.json.role === 'farmer');
  check('no token -> 401', (await call('GET', '/auth/me')).status === 401);
  check('garbage token -> 401', (await call('GET', '/auth/me', { token: 'abc.def.ghi' })).status === 401);

  const r1 = await call('POST', '/auth/refresh', { cookie: farmer.cookie });
  const r1b = await call('POST', '/auth/refresh', { cookie: farmer.cookie }); // second tab, same old cookie
  check('refresh works', r1.status === 200 && !!r1.json.accessToken);
  check('second tab refreshing at the same moment is not logged out', r1b.status === 200);
  check('refresh without cookie -> no_session', (await call('POST', '/auth/refresh')).json?.code === 'no_session');

  console.log('Roles');
  check('farmer cannot open admin stats', (await call('GET', '/admin/stats', { token: farmer.token })).status === 403);
  check('buyer cannot create listings', (await call('POST', '/listings', { token: buyer.token, body: {} })).status === 403);
  check('farmer cannot create offers', (await call('POST', '/offers', { token: farmer.token, body: {} })).status === 403);
  check('buyer cannot update prices', (await call('PATCH', `/prices/${prices.json.items[0].id}`, { token: buyer.token, body: {} })).status === 403);

  console.log('Offer lifecycle');
  const listingBody = {
    cropName: 'Smoke Wheat', variety: 'Test Grade', category: 'Cereals & Grains', quantity: 100, unit: 'Maund (40 kg / من)',
    pricePerUnit: 1000, minOrderQuantity: 10, harvestDate: todayPK, availableUntil: pkDay(30),
    description: 'smoke', imageUrl: '/images/grain.webp',
  };
  const badPrice = await call('POST', '/listings', { token: farmer.token, body: { ...listingBody, pricePerUnit: '1000' } });
  check('string price is rejected (no coercion)', badPrice.status === 400 && badPrice.json?.code === 'invalid_price');
  const badImg = await call('POST', '/listings', { token: farmer.token, body: { ...listingBody, imageUrl: 'javascript:alert(1)' } });
  check('unsafe image URL rejected', badImg.status === 400 && badImg.json?.code === 'invalid_image');
  const made = await call('POST', '/listings', { token: farmer.token, body: { ...listingBody, farmerId: 'x', farmerName: 'Evil' } });
  check('listing created', made.status === 201);
  const lid = made.json.id;
  check('farmer identity comes from the token, not the body', made.json.farmerName === farmer.user.name && made.json.farmerId === farmer.user.id);

  const o1 = await call('POST', '/offers', { token: buyer.token, body: { listingId: lid, quantity: 25, offeredPricePerUnit: 1000, message: 'hi', totalPrice: 1 } });
  check('offer created, total computed by server', o1.status === 201 && o1.json.totalPrice === 25000 && o1.json.status === 'pending');
  check('phones hidden while pending', o1.json.farmerPhone === '' && o1.json.buyerPhone === '');
  const oid = o1.json.id;
  const dup = await call('POST', '/offers', { token: buyer.token, body: { listingId: lid, quantity: 25, offeredPricePerUnit: 900, message: '' } });
  check('duplicate live offer blocked', dup.status === 409 && dup.json?.code === 'duplicate_offer');
  const tooMany = await call('POST', '/offers', { token: buyer.token, body: { listingId: lid, quantity: 5000, offeredPricePerUnit: 900, message: '' } });
  check('quantity above stock rejected', tooMany.status === 400 || tooMany.status === 409);
  check('buyer cannot complete a pending offer', (await call('PATCH', `/offers/${oid}/status`, { token: buyer.token, body: { action: 'complete' } })).status === 409);
  check("another farmer cannot act on this offer", (await call('PATCH', `/offers/${oid}/status`, { token: farmer2.token, body: { action: 'accept' } })).status === 403);
  check('other buyers/farmers do not see it', !(await call('GET', '/offers', { token: farmer2.token })).json.items.some((o) => o.id === oid));

  const counter = await call('PATCH', `/offers/${oid}/status`, { token: farmer.token, body: { action: 'counter', counterPricePerUnit: 1100, counterNote: 'meet me' } });
  check('farmer counters', counter.status === 200 && counter.json.status === 'countered');
  const acc = await call('PATCH', `/offers/${oid}/status`, { token: buyer.token, body: { action: 'accept' } });
  check('buyer accepts the counter, total recomputed', acc.status === 200 && acc.json.status === 'accepted' && acc.json.totalPrice === 27500);
  check('phones revealed once accepted', /^\+92/.test(acc.json.farmerPhone) && /^\+92/.test(acc.json.buyerPhone));
  check('accepting twice is a conflict', (await call('PATCH', `/offers/${oid}/status`, { token: buyer.token, body: { action: 'accept' } })).status === 409);
  const del = await call('DELETE', `/listings/${lid}`, { token: farmer.token });
  check('cannot delete a listing with an accepted deal', del.status === 409 && del.json?.code === 'has_active_offers');

  const done = await call('PATCH', `/offers/${oid}/status`, { token: farmer.token, body: { action: 'complete' } });
  check('farmer completes', done.status === 200 && done.json.status === 'completed');
  const mine = await call('GET', '/listings/mine', { token: farmer.token });
  const mineL = mine.json.items.find((l) => l.id === lid);
  check('stock reduced, listing stays live (75 left)', mineL?.quantity === 75 && mineL?.status === 'active');

  const before = (await call('GET', '/auth/me', { token: farmer.token })).json;
  const rate = await call('POST', `/offers/${oid}/rating`, { token: buyer.token, body: { rating: 5, comment: 'great' } });
  check('buyer rates the deal', rate.status === 200 && rate.json.ratingGiven === 5);
  check('rating twice is rejected', (await call('POST', `/offers/${oid}/rating`, { token: buyer.token, body: { rating: 1 } })).json?.code === 'cannot_rate');
  check('rating out of range rejected', (await call('POST', `/offers/${oid}/rating`, { token: buyer.token, body: { rating: 9 } })).json?.code === 'invalid_rating');
  const after = (await call('GET', '/auth/me', { token: farmer.token })).json;
  check('farmer rating/reviews updated server-side', after.reviewsCount === (before.reviewsCount ?? 0) + 1);

  console.log('Favorites and alerts');
  check('favorite add', (await call('PUT', `/favorites/${lid}`, { token: buyer.token })).status === 204);
  check('favorite listed', (await call('GET', '/favorites', { token: buyer.token })).json.items.includes(lid));
  check('favorite remove', (await call('DELETE', `/favorites/${lid}`, { token: buyer.token })).status === 204);
  const crop = prices.json.items[0].cropName;
  const al = await call('POST', '/price-alerts', { token: buyer.token, body: { cropName: crop, targetPrice: 1, condition: 'above' } });
  check('alert created and already triggered (price >= 1)', al.status === 201);
  const alerts = await call('GET', '/price-alerts', { token: buyer.token });
  check('alert reported as triggered', alerts.json.items.find((a) => a.id === al.json.id)?.isTriggered === true);
  check("another user cannot delete my alert (no effect)", (await call('DELETE', `/price-alerts/${al.json.id}`, { token: farmer.token })).status === 204 &&
    (await call('GET', '/price-alerts', { token: buyer.token })).json.items.some((a) => a.id === al.json.id));
  check('alert delete', (await call('DELETE', `/price-alerts/${al.json.id}`, { token: buyer.token })).status === 204);
  check('alert for unknown crop rejected', (await call('POST', '/price-alerts', { token: buyer.token, body: { cropName: { $ne: 1 }, targetPrice: 5, condition: 'above' } })).status === 400);

  console.log('Admin');
  check('admin stats', (await call('GET', '/admin/stats', { token: admin.token })).json?.farmers >= 2);
  check('admin users', (await call('GET', '/admin/users', { token: admin.token })).json.items.length >= 4);
  const hide = await call('PATCH', `/admin/listings/${lid}/moderation`, { token: admin.token, body: { approved: false } });
  check('admin hides listing', hide.status === 200 && hide.json.isModerated === false);
  check('hidden listing leaves the public market', !(await call('GET', '/listings')).json.items.some((l) => l.id === lid));
  await call('PATCH', `/admin/listings/${lid}/moderation`, { token: admin.token, body: { approved: true } });
  const p = prices.json.items[0];
  const upd = await call('PATCH', `/prices/${p.id}`, { token: admin.token, body: { wholesalePrice: p.wholesalePrice + 100, retailPrice: p.retailPrice + 100 } });
  check('admin updates a price, trend goes up', upd.status === 200 && upd.json.trend === 'up' && upd.json.historicalPrices.length <= 10);
  await call('PATCH', `/prices/${p.id}`, { token: admin.token, body: { wholesalePrice: p.wholesalePrice, retailPrice: p.retailPrice } });
  check('invalid object id is a clean 404', (await call('PATCH', '/prices/not-an-id', { token: admin.token, body: {} })).status === 404);

  console.log('Sign-out');
  const out = await call('POST', '/auth/logout', { cookie: r1.cookie });
  check('logout 204', out.status === 204);
  const reuse = await call('POST', '/auth/refresh', { cookie: r1.cookie });
  check('refresh after logout is refused', reuse.status === 401);

  // cleanup: remove the listing created by this run
  await call('DELETE', `/listings/${lid}`, { token: farmer.token });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nSmoke test aborted: ${err.message}`);
  process.exit(1);
});
