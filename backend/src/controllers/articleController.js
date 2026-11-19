import { Article } from '../models/Article.js';
import { createError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ARTICLE_CATEGORIES } from '../constants/enums.js';
import { LIMITS } from '../constants/limits.js';
import { isPlainObject, str, strings } from '../utils/validate.js';

export const getArticles = asyncHandler(async (_req, res) => {
  const articles = await Article.find().sort({ publishedDate: -1, _id: -1 }).limit(200);
  res.json({ items: articles.map((a) => a.toJSON()) });
});

export const createArticle = asyncHandler(async (req, res) => {
  const b = isPlainObject(req.body) ? req.body : {};
  const title = str(b.title, 200);
  const summary = str(b.summary, LIMITS.textLong);
  const content = strings(b.content, 50, 5000);
  if (!title || !summary || content.length === 0) throw createError(400, 'invalid_text');
  if (typeof b.category !== 'string' || !ARTICLE_CATEGORIES.includes(b.category)) throw createError(400, 'invalid_category');

  const words = content.join(' ').split(/\s+/).length;
  const article = await Article.create({
    title,
    category: b.category,
    cropTag: str(b.cropTag, LIMITS.textShort) || 'All Crops',
    author: req.user.name,
    readTimeMin: Math.max(2, Math.ceil(words / 180)),
    publishedDate: new Date().toISOString(),
    summary,
    content,
    keyRecommendations: strings(b.keyRecommendations, 50, 1000),
  });
  res.status(201).json(article.toJSON());
});

export const deleteArticle = asyncHandler(async (req, res) => {
  const a = await Article.findByIdAndDelete(req.params.id);
  if (!a) throw createError(404, 'not_found');
  res.status(204).end();
});
