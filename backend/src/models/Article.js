import mongoose from 'mongoose';
import { ARTICLE_CATEGORIES } from '../constants/enums.js';

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    category: { type: String, enum: ARTICLE_CATEGORIES, required: true },
    cropTag: { type: String, required: true, maxlength: 80 },
    author: { type: String, required: true },
    readTimeMin: { type: Number, default: 4 },
    publishedDate: { type: String, required: true }, // ISO 8601
    summary: { type: String, required: true, maxlength: 1000 },
    content: { type: [String], required: true },
    keyRecommendations: { type: [String], default: [] },
  },
  { timestamps: true },
);

articleSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  },
});

export const Article = mongoose.model('Article', articleSchema);
