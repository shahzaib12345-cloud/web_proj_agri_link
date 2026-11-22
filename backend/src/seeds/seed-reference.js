// Production-safe: loads the starter price board and advisory articles ONLY when those collections are empty.
// Creates no users and never deletes anything. Edit src/seeds/seed-data.json first to match your markets.
import mongoose from 'mongoose';
import { assertEnv, env } from '../config/env.js';
import { MarketPrice } from '../models/MarketPrice.js';
import { Article } from '../models/Article.js';
import { buildArticles, buildPrices, dayDelta, loadSeedData } from './lib.js';

try {
  assertEnv();
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  const data = loadSeedData();

  if ((await MarketPrice.estimatedDocumentCount()) === 0) {
    await MarketPrice.insertMany(buildPrices(data));
    console.log(`Loaded ${data.prices.length} starter market prices (update them from the admin panel).`);
  } else {
    console.log('Market prices already exist: skipped.');
  }

  if ((await Article.estimatedDocumentCount()) === 0) {
    await Article.insertMany(buildArticles(data, dayDelta(data)));
    console.log(`Loaded ${data.articles.length} starter advisory articles.`);
  } else {
    console.log('Articles already exist: skipped.');
  }
  await mongoose.disconnect();
} catch (err) {
  console.error('Reference seeding failed:', err.message);
  process.exit(1);
}
