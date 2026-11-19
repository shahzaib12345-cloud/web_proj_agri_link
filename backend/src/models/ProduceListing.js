import mongoose from 'mongoose';
import { CATEGORIES, LISTING_STATUSES, UNITS } from '../constants/enums.js';

const produceListingSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmerName: { type: String, required: true },
    farmerLocation: {
      district: { type: String, required: true },
      tehsil: { type: String, required: true },
    },
    cropName: { type: String, required: true, trim: true, maxlength: 80 },
    variety: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, enum: CATEGORIES, required: true },
    quantity: { type: Number, required: true, min: 0, max: 1_000_000 },
    unit: { type: String, enum: UNITS, required: true },
    pricePerUnit: { type: Number, required: true, min: 1, max: 10_000_000 },
    currency: { type: String, default: 'PKR' },
    minOrderQuantity: { type: Number, required: true, min: 1 },
    harvestDate: { type: String, required: true },
    availableUntil: { type: String, required: true },
    description: { type: String, default: '', maxlength: 1000 },
    imageUrl: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: LISTING_STATUSES, default: 'active' },
    isModerated: { type: Boolean, default: true },
  },
  { timestamps: true },
);

produceListingSchema.index({ isModerated: 1, status: 1, createdAt: -1 });

produceListingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.farmerId = ret.farmerId.toString();
    ret.createdAt = ret.createdAt instanceof Date ? ret.createdAt.toISOString() : ret.createdAt;
    delete ret._id;
    delete ret.__v;
    delete ret.updatedAt;
    return ret;
  },
});

export const ProduceListing = mongoose.model('ProduceListing', produceListingSchema);
