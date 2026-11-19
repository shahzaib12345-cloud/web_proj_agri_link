import mongoose from 'mongoose';
import { BUYER_TYPES } from '../constants/enums.js';

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false }, // bcrypt hash; never returned
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true, index: true },
    location: {
      district: { type: String, required: true, trim: true, maxlength: 80 },
      tehsil: { type: String, required: true, trim: true, maxlength: 80 },
      village: { type: String, default: '', trim: true, maxlength: 80 },
    },
    cropsGrown: { type: [String], default: [] },
    farmSizeAcres: { type: Number },
    buyerType: { type: String, enum: BUYER_TYPES },
    isVerified: { type: Boolean, default: false },
    rating: { type: Number },
    reviewsCount: { type: Number, default: 0 },
    joinedDate: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    delete ret.createdAt;
    delete ret.updatedAt;
    if (!ret.avatarUrl) delete ret.avatarUrl;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
