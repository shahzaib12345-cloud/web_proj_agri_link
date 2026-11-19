import { ProduceListing } from '../models/ProduceListing.js';
import { Offer } from '../models/Offer.js';
import { Favorite } from '../models/Favorite.js';
import { createError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listingViews } from '../utils/views.js';
import { CATEGORIES, UNITS } from '../constants/enums.js';
import { LIMITS } from '../constants/limits.js';
import { env } from '../config/env.js';
import { initialModeration } from '../utils/moderation.js';
import {
  addDaysISO,
  inRange,
  isPlainObject,
  isRealISODate,
  isSafeImageUrl,
  isValidHarvestDate,
  num,
  str,
  text,
  todayISO,
} from '../utils/validate.js';

// TODO(scale): add server-side search/filter/pagination (frontend marks this TODO(api) too).
const PUBLIC_LIMIT = 1000;

export const getListings = asyncHandler(async (_req, res) => {
  const listings = await ProduceListing.find({
    isModerated: true,
    status: { $ne: 'sold' },
    availableUntil: { $gte: todayISO() }, // expired listings drop off the public market
  })
    .sort({ createdAt: -1 })
    .limit(PUBLIC_LIMIT);
  res.json({ items: await listingViews(listings) });
});

export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await ProduceListing.find({ farmerId: req.user._id }).sort({ createdAt: -1 }).limit(500);
  res.json({ items: await listingViews(listings) });
});

export const createListing = asyncHandler(async (req, res) => {
  const me = req.user;
  const b = isPlainObject(req.body) ? req.body : {};

  const cropName = str(b.cropName, LIMITS.textShort);
  const variety = str(b.variety, LIMITS.textShort);
  if (!cropName || !variety) throw createError(400, 'invalid_text');
  if (typeof b.category !== 'string' || !CATEGORIES.includes(b.category)) throw createError(400, 'invalid_category');
  if (typeof b.unit !== 'string' || !UNITS.includes(b.unit)) throw createError(400, 'invalid_unit');

  const quantity = num(b.quantity);
  const pricePerUnit = num(b.pricePerUnit);
  const minOrderQuantity = num(b.minOrderQuantity);
  if (!inRange(quantity, LIMITS.quantity.min, LIMITS.quantity.max)) throw createError(400, 'invalid_quantity');
  if (!inRange(pricePerUnit, LIMITS.price.min, LIMITS.price.max)) throw createError(400, 'invalid_price');
  if (!inRange(minOrderQuantity, 1, quantity)) throw createError(400, 'invalid_min_order');
  if (!isValidHarvestDate(b.harvestDate)) throw createError(400, 'invalid_harvest_date');
  if (!isSafeImageUrl(b.imageUrl)) throw createError(400, 'invalid_image');

  // Honour the farmer's availability date when it is sane, otherwise default to 30 days.
  let availableUntil = addDaysISO(30);
  if (b.availableUntil !== undefined) {
    if (!isRealISODate(b.availableUntil) || b.availableUntil < todayISO() || b.availableUntil > addDaysISO(365)) {
      throw createError(400, 'invalid_available_until');
    }
    availableUntil = b.availableUntil;
  }

  const listing = await ProduceListing.create({
    farmerId: me._id, // derived from the token, never from the body
    farmerName: me.name,
    farmerLocation: { district: me.location.district, tehsil: me.location.tehsil },
    cropName,
    variety,
    category: b.category,
    quantity,
    unit: b.unit,
    pricePerUnit,
    currency: 'PKR',
    minOrderQuantity,
    harvestDate: b.harvestDate,
    availableUntil,
    description: text(b.description, LIMITS.textLong),
    imageUrl: b.imageUrl,
    status: 'active',
    isModerated: initialModeration(env.listingApproval, me),
  });
  const [view] = await listingViews([listing]);
  res.status(201).json(view);
});

export const deleteListing = asyncHandler(async (req, res) => {
  const me = req.user;
  const listing = await ProduceListing.findById(req.params.id);
  if (!listing) throw createError(404, 'not_found');
  if (me.role === 'farmer' && !listing.farmerId.equals(me._id)) throw createError(403, 'forbidden');

  // A deal that was already accepted must be completed, not silently destroyed.
  if (await Offer.exists({ listingId: listing._id, status: 'accepted' })) {
    throw createError(409, 'has_active_offers');
  }
  await Promise.all([
    Offer.updateMany({ listingId: listing._id, status: { $in: ['pending', 'countered'] } }, { $set: { status: 'rejected' } }),
    Favorite.deleteMany({ listingId: listing._id }),
    listing.deleteOne(),
  ]);
  res.status(204).end();
});
