import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import listingRoutes from './listingRoutes.js';
import offerRoutes from './offerRoutes.js';
import { alertsRouter, pricesRouter } from './priceRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import articleRoutes from './articleRoutes.js';
import adminRoutes from './adminRoutes.js';

const api = Router();

api.get('/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded' });
});

api.use('/auth', authRoutes);
api.use('/users', userRoutes);
api.use('/listings', listingRoutes);
api.use('/offers', offerRoutes);
api.use('/prices', pricesRouter);
api.use('/price-alerts', alertsRouter);
api.use('/favorites', favoriteRoutes);
api.use('/weather', weatherRoutes);
api.use('/articles', articleRoutes);
api.use('/admin', adminRoutes);

export default api;
