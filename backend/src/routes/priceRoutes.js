import { Router } from 'express';
import {
  createPrice,
  createPriceAlert,
  deletePrice,
  deletePriceAlert,
  getPriceAlerts,
  getPrices,
  updatePrice,
} from '../controllers/priceController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validId } from '../middlewares/security.js';

export const pricesRouter = Router();
pricesRouter.get('/', getPrices);
pricesRouter.post('/', requireAuth, requireRole('admin'), createPrice);
pricesRouter.patch('/:id', requireAuth, requireRole('admin'), validId('id'), updatePrice);
pricesRouter.delete('/:id', requireAuth, requireRole('admin'), validId('id'), deletePrice);

export const alertsRouter = Router();
alertsRouter.get('/', requireAuth, getPriceAlerts);
alertsRouter.post('/', requireAuth, createPriceAlert);
alertsRouter.delete('/:id', requireAuth, validId('id'), deletePriceAlert);
