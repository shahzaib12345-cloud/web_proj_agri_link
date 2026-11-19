import mongoose from 'mongoose';
import { UNITS } from '../constants/enums.js';

const marketPriceSchema = new mongoose.Schema(
  {
    cropName: { type: String, required: true, index: true },
    marketName: { type: String, required: true },
    region: { type: String, required: true },
    wholesalePrice: { type: Number, required: true },
    retailPrice: { type: Number, required: true },
    unit: { type: String, enum: UNITS, required: true },
    currency: { type: String, default: 'PKR' },
    trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
    changePercent: { type: Number, default: 0 },
    historicalPrices: [
      new mongoose.Schema(
        { date: { type: String, required: true }, price: { type: Number, required: true } },
        { _id: false },
      ),
    ],
    lastUpdated: { type: String, required: true },
  },
  { timestamps: true },
);

marketPriceSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  },
});

export const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema);
