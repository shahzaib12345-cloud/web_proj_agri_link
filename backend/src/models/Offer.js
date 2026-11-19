import mongoose from 'mongoose';
import { OFFER_STATUSES } from '../constants/enums.js';

const offerSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceListing', required: true, index: true },
    cropName: { type: String, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmerName: { type: String, required: true },
    farmerPhone: { type: String, required: true }, // only ever exposed through offerView() once accepted
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerName: { type: String, required: true },
    buyerPhone: { type: String, required: true }, // same
    offeredPricePerUnit: { type: Number, required: true },
    listingPricePerUnit: { type: Number, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    message: { type: String, default: '', maxlength: 1000 },
    status: { type: String, enum: OFFER_STATUSES, default: 'pending', index: true },
    counterPricePerUnit: { type: Number },
    counterNote: { type: String, default: '', maxlength: 1000 },
    completedAt: { type: String },
    ratingGiven: { type: Number, min: 1, max: 5 },
    reviewComment: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true },
);

offerSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.listingId = ret.listingId.toString();
    ret.farmerId = ret.farmerId.toString();
    ret.buyerId = ret.buyerId.toString();
    ret.createdAt = ret.createdAt instanceof Date ? ret.createdAt.toISOString() : ret.createdAt;
    delete ret._id;
    delete ret.__v;
    delete ret.updatedAt;
    return ret;
  },
});

export const Offer = mongoose.model('Offer', offerSchema);
