import { User } from '../models/User.js';

/** What the public may see of a listing, plus the farmer's trust signals. Never includes a phone number. */
export async function listingViews(listings) {
  const ids = [...new Set(listings.map((l) => String(l.farmerId)))];
  const farmers = ids.length
    ? await User.find({ _id: { $in: ids } }).select('rating reviewsCount isVerified').lean()
    : [];
  const byId = new Map(farmers.map((f) => [String(f._id), f]));
  return listings.map((l) => {
    const json = l.toJSON();
    const f = byId.get(json.farmerId);
    json.farmerRating = f?.rating;
    json.farmerReviews = f?.reviewsCount;
    json.farmerVerified = f?.isVerified ?? false;
    return json;
  });
}

/** Counterpart phone numbers are revealed only after the deal is accepted. */
export function offerView(offer) {
  const json = offer.toJSON();
  const reveal = json.status === 'accepted' || json.status === 'completed';
  if (!reveal) {
    json.farmerPhone = '';
    json.buyerPhone = '';
  }
  return json;
}
