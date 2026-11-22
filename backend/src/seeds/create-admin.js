// Creates (or resets the password of) an admin account. Credentials come from the environment so the
// password never appears in shell history or in the repository:
//   ADMIN_PHONE="+92 300 1234567" ADMIN_PASSWORD='...' ADMIN_NAME='Your Name' npm run create-admin
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { assertEnv, env } from '../config/env.js';
import { User } from '../models/User.js';
import { checkPassword, normalizePhone } from '../constants/limits.js';
import { todayISO } from '../utils/validate.js';

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const phone = normalizePhone(process.env.ADMIN_PHONE);
const password = process.env.ADMIN_PASSWORD;
const name = (process.env.ADMIN_NAME || 'Administrator').trim();

if (!phone) fail('ADMIN_PHONE must be a valid Pakistani mobile number, e.g. +923001234567.');
if (checkPassword(password)) fail('ADMIN_PASSWORD must be 8-64 characters with letters and numbers.');
if (password === 'Demo@1234') fail('Do not use the public demo password.');
if (name.length < 2 || name.length > 80) fail('ADMIN_NAME must be 2-80 characters.');

try {
  assertEnv();
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  const hash = await bcrypt.hash(password, env.bcryptRounds);
  const existing = await User.findOne({ phone });

  if (existing && existing.role !== 'admin') {
    fail(`${phone} already belongs to a ${existing.role} account. Use a different phone number for the admin.`);
  }
  if (existing) {
    existing.password = hash;
    await existing.save();
    console.log(`Admin ${phone}: password reset.`);
  } else {
    await User.create({
      phone,
      password: hash,
      name,
      role: 'admin',
      location: { district: 'Punjab', tehsil: 'Head Office', village: '' },
      isVerified: true,
      reviewsCount: 0,
      joinedDate: todayISO(),
    });
    console.log(`Admin ${phone} created.`);
  }
  await mongoose.disconnect();
} catch (err) {
  console.error('create-admin failed:', err.message);
  process.exit(1);
}
