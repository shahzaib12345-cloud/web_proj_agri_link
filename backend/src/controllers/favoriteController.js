import { Favorite } from '../models/Favorite.js';
import { ProduceListing } from '../models/ProduceListing.js';
import { createError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getFavorites = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(500);
  res.json({ items: favs.map((f) => f.listingId.toString()) });
});

export const addFavorite = asyncHandler(async (req, res) => {
  if (!(await ProduceListing.exists({ _id: req.params.id }))) throw createError(404, 'not_found');
  await Favorite.updateOne(
    { userId: req.user._id, listingId: req.params.id },
    { $setOnInsert: { userId: req.user._id, listingId: req.params.id } },
    { upsert: true },
  );
  res.status(204).end();
});

export const removeFavorite = asyncHandler(async (req, res) => {
  await Favorite.deleteOne({ userId: req.user._id, listingId: req.params.id });
  res.status(204).end();
});
