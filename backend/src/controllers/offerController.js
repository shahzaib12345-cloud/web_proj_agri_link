import { Offer } from '../models/Offer.js';
import { ProduceListing } from '../models/ProduceListing.js';
import { User } from '../models/User.js';
import { createError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { offerView } from '../utils/views.js';
import { LIMITS } from '../constants/limits.js';
import { inRange, isObjectId, isPlainObject, num, text, todayISO } from '../utils/validate.js';

export const getOffers = asyncHandler(async (req, res) => {
  const me = req.user;
  const filter = me.role === 'admin' ? {} : me.role === 'farmer' ? { farmerId: me._id } : { buyerId: me._id };
  const offers = await Offer.find(filter).sort({ createdAt: -1 }).limit(1000);
  res.json({ items: offers.map(offerView) });
});

export const createOffer = asyncHandler(async (req, res) => {
  const me = req.user;
  const b = isPlainObject(req.body) ? req.body : {};

  if (!isObjectId(b.listingId)) throw createError(404, 'not_found');
  const listing = await ProduceListing.findById(b.listingId);
  if (!listing || !listing.isModerated || listing.status === 'sold' || listing.availableUntil < todayISO()) {
    throw createError(404, 'not_found');
  }

  const quantity = num(b.quantity);
  const price = num(b.offeredPricePerUnit);
  if (!inRange(quantity, listing.minOrderQuantity, listing.quantity)) throw createError(400, 'invalid_quantity');
  if (!inRange(price, LIMITS.price.min, LIMITS.price.max)) throw createError(400, 'invalid_price');

  // One live negotiation per buyer per listing.
  const open = await Offer.exists({
    listingId: listing._id,
    buyerId: me._id,
    status: { $in: ['pending', 'countered', 'accepted'] },
  });
  if (open) throw createError(409, 'duplicate_offer');

  const farmer = await User.findById(listing.farmerId).select('phone');
  if (!farmer) throw createError(404, 'not_found');

  const offer = await Offer.create({
    listingId: listing._id,
    cropName: listing.cropName,
    farmerId: listing.farmerId,
    farmerName: listing.farmerName,
    farmerPhone: farmer.phone,
    buyerId: me._id,
    buyerName: me.name,
    buyerPhone: me.phone,
    offeredPricePerUnit: price,
    listingPricePerUnit: listing.pricePerUnit,
    quantity,
    unit: listing.unit,
    totalPrice: quantity * price, // computed here, never trusted from the client
    message: text(b.message, LIMITS.textLong),
    status: 'pending',
  });
  res.status(201).json(offerView(offer));
});

/** Listing must still be sellable and have enough stock when a deal is accepted. */
async function assertListingCanSell(offer) {
  const listing = await ProduceListing.findById(offer.listingId);
  if (!listing || !listing.isModerated || listing.status === 'sold' || listing.quantity < offer.quantity) {
    throw createError(409, 'invalid_transition');
  }
  return listing;
}

/** After a completed sale: reduce stock, keep the listing live if there is enough left. */
async function applyCompletedSale(offer) {
  const listing = await ProduceListing.findOneAndUpdate(
    { _id: offer.listingId },
    { $inc: { quantity: -offer.quantity } },
    { new: true },
  );
  if (!listing) return;
  const remaining = Math.max(0, listing.quantity);
  let status = 'sold';
  if (remaining >= listing.minOrderQuantity) {
    const stillNegotiating = await Offer.exists({ listingId: listing._id, status: 'accepted' });
    status = stillNegotiating ? 'pending_offer' : 'active';
  }
  await ProduceListing.updateOne({ _id: listing._id }, { $set: { quantity: remaining, status } });
}

export const updateOfferStatus = asyncHandler(async (req, res) => {
  const me = req.user;
  const b = isPlainObject(req.body) ? req.body : {};
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw createError(404, 'not_found');

  const isFarmer = me.role === 'farmer' && offer.farmerId.equals(me._id);
  const isBuyer = me.role === 'buyer' && offer.buyerId.equals(me._id);
  if (!isFarmer && !isBuyer) throw createError(403, 'forbidden');

  const from = offer.status;
  const action = b.action;
  let set;
  let effect = null;

  if (isFarmer && from === 'pending' && action === 'accept') {
    await assertListingCanSell(offer);
    set = { status: 'accepted' };
    effect = 'accepted';
  } else if (isFarmer && from === 'pending' && action === 'reject') {
    set = { status: 'rejected' };
  } else if (isFarmer && from === 'pending' && action === 'counter') {
    const counter = num(b.counterPricePerUnit);
    if (!inRange(counter, LIMITS.price.min, LIMITS.price.max)) throw createError(400, 'invalid_price');
    set = { status: 'countered', counterPricePerUnit: counter, counterNote: text(b.counterNote, LIMITS.textLong) };
  } else if (isBuyer && from === 'countered' && action === 'accept' && offer.counterPricePerUnit) {
    await assertListingCanSell(offer);
    set = {
      status: 'accepted',
      offeredPricePerUnit: offer.counterPricePerUnit,
      totalPrice: offer.quantity * offer.counterPricePerUnit,
    };
    effect = 'accepted';
  } else if (isFarmer && from === 'accepted' && action === 'complete') {
    set = { status: 'completed', completedAt: new Date().toISOString() };
    effect = 'completed';
  } else {
    throw createError(409, 'invalid_transition');
  }

  // Compare-and-set: two simultaneous requests cannot both apply the same transition.
  const updated = await Offer.findOneAndUpdate({ _id: offer._id, status: from }, { $set: set }, { new: true });
  if (!updated) throw createError(409, 'invalid_transition');

  if (effect === 'accepted') {
    await ProduceListing.updateOne({ _id: updated.listingId, status: { $ne: 'sold' } }, { $set: { status: 'pending_offer' } });
  } else if (effect === 'completed') {
    await applyCompletedSale(updated);
  }
  res.json(offerView(updated));
});

export const rateOffer = asyncHandler(async (req, res) => {
  const me = req.user;
  const b = isPlainObject(req.body) ? req.body : {};
  const rating = num(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw createError(400, 'invalid_rating');

  // Only the buyer of a completed deal, once.
  const updated = await Offer.findOneAndUpdate(
    { _id: req.params.id, buyerId: me._id, status: 'completed', ratingGiven: { $exists: false } },
    { $set: { ratingGiven: rating, reviewComment: text(b.comment, LIMITS.textLong) } },
    { new: true },
  );
  if (!updated) {
    const mine = await Offer.exists({ _id: req.params.id, buyerId: me._id });
    throw mine ? createError(409, 'cannot_rate') : createError(404, 'not_found');
  }

  // Running average maintained atomically on the server.
  await User.updateOne(
    { _id: updated.farmerId },
    [
      {
        $set: {
          rating: {
            $round: [
              {
                $divide: [
                  { $add: [{ $multiply: [{ $ifNull: ['$rating', rating] }, { $ifNull: ['$reviewsCount', 0] }] }, rating] },
                  { $add: [{ $ifNull: ['$reviewsCount', 0] }, 1] },
                ],
              },
              1,
            ],
          },
          reviewsCount: { $add: [{ $ifNull: ['$reviewsCount', 0] }, 1] },
        },
      },
    ],
    { timestamps: false },
  );
  res.json(offerView(updated));
});
