// DEMO DATA ONLY. Wipes the database and loads sample users (password Demo@1234), listings, offers,
// prices and articles. Refuses to run in production unless --force-demo is passed.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { assertEnv, env } from '../config/env.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ProduceListing } from '../models/ProduceListing.js';
import { Offer } from '../models/Offer.js';
import { MarketPrice } from '../models/MarketPrice.js';
import { Article } from '../models/Article.js';
import { PriceAlert } from '../models/PriceAlert.js';
import { Favorite } from '../models/Favorite.js';
import { buildArticles, buildPrices, dayDelta, loadSeedData, shiftDate, shiftDateTime } from './lib.js';

const DEMO_PASSWORD = 'Demo@1234';

if (env.isProd && !process.argv.includes('--force-demo')) {
  console.error(
    'Refusing to load DEMO data in production: it wipes the database and creates accounts with a public password.\n' +
      'For a real deployment run:  npm run seed:reference   (crop prices + articles only)\n' +
      'and                         npm run create-admin     (your own admin account)\n' +
      'Pass --force-demo only for a throwaway staging database.',
  );
  process.exit(1);
}

try {
  assertEnv();
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  console.log('Connected. Loading demo data...');

  const data = loadSeedData();
  const delta = dayDelta(data);
  const ids = new Map();
  const oid = (key) => {
    if (!ids.has(key)) ids.set(key, new mongoose.Types.ObjectId());
    return ids.get(key);
  };

  await Promise.all(
    [User, RefreshToken, ProduceListing, Offer, MarketPrice, Article, PriceAlert, Favorite].map((m) => m.deleteMany({})),
  );

  const hash = await bcrypt.hash(DEMO_PASSWORD, env.bcryptRounds);
  await User.insertMany(data.users.map(({ id, ...u }) => ({ ...u, _id: oid(id), password: hash })));

  await ProduceListing.insertMany(
    data.listings.map(({ id, farmerId, createdAt, harvestDate, availableUntil, ...l }) => ({
      ...l,
      _id: oid(id),
      farmerId: oid(farmerId),
      harvestDate: shiftDate(harvestDate, delta),
      availableUntil: shiftDate(availableUntil, delta),
      createdAt: new Date(shiftDateTime(createdAt, delta)),
    })),
  );

  await Offer.insertMany(
    data.offers.map(({ id, listingId, farmerId, buyerId, createdAt, completedAt, ...o }) => ({
      ...o,
      _id: oid(id),
      listingId: oid(listingId),
      farmerId: oid(farmerId),
      buyerId: oid(buyerId),
      createdAt: new Date(shiftDateTime(createdAt, delta)),
      ...(completedAt ? { completedAt: shiftDateTime(completedAt, delta) } : {}),
    })),
  );

  await MarketPrice.insertMany(buildPrices(data));
  await Article.insertMany(buildArticles(data, delta));

  await PriceAlert.insertMany(
    data.alerts.map(({ id, userId, createdAt, ...a }) => ({ ...a, userId: oid(userId), createdAt: shiftDate(createdAt, delta) })),
  );

  await Favorite.insertMany(
    Object.entries(data.favorites).flatMap(([userId, listingIds]) =>
      listingIds.map((l) => ({ userId: oid(userId), listingId: oid(l) })),
    ),
  );

  console.log('Demo data loaded. Sign in with password Demo@1234:');
  for (const u of data.users) console.log(`  ${u.role.padEnd(6)} ${u.phone}  ${u.name}`);
  await mongoose.disconnect();
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exit(1);
}
