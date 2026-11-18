import { User } from '../models/User.js';
import { ProduceListing } from '../models/ProduceListing.js';
import { Offer } from '../models/Offer.js';
import { createError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listingViews } from '../utils/views.js';

export const getStats = asyncHandler(async (_req, res) => {
  const [farmers, buyers, activeListings, completed, pendingVerifications] = await Promise.all([
    User.countDocuments({ role: 'farmer' }),
    User.countDocuments({ role: 'buyer' }),
    ProduceListing.countDocuments({ status: 'active' }),
    Offer.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$totalPrice' } } }]),
    User.countDocuments({ role: { $ne: 'admin' }, isVerified: false }),
  ]);
  res.json({
    farmers,
    buyers,
    activeListings,
    completedOffers: completed[0]?.count ?? 0,
    completedValue: completed[0]?.value ?? 0,
    pendingVerifications,
  });
});

export const getAllUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(2000);
  res.json({ items: users.map((u) => u.toJSON()) });
});

export const setUserVerification = asyncHandler(async (req, res) => {
  if (typeof req.body?.verified !== 'boolean') throw createError(400, 'invalid_body');
  const user = await User.findById(req.params.id);
  if (!user) throw createError(404, 'not_found');
  user.isVerified = req.body.verified;
  await user.save();
  res.json(user.toJSON());
});

export const getAdminListings = asyncHandler(async (_req, res) => {
  const listings = await ProduceListing.find().sort({ createdAt: -1 }).limit(2000);
  res.json({ items: await listingViews(listings) });
});

export const setListingModeration = asyncHandler(async (req, res) => {
  if (typeof req.body?.approved !== 'boolean') throw createError(400, 'invalid_body');
  const listing = await ProduceListing.findById(req.params.id);
  if (!listing) throw createError(404, 'not_found');
  listing.isModerated = req.body.approved;
  await listing.save();
  const [view] = await listingViews([listing]);
  res.json(view);
});
