import mongoose from 'mongoose';

const priceAlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  cropName: { type: String, required: true },
  targetPrice: { type: Number, required: true },
  condition: { type: String, enum: ['above', 'below'], required: true },
  isTriggered: { type: Boolean, default: false },
  createdAt: { type: String, required: true }, // YYYY-MM-DD, the shape the frontend expects
});

priceAlertSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const PriceAlert = mongoose.model('PriceAlert', priceAlertSchema);
