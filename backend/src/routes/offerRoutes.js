import { Router } from 'express';
import { createOffer, getOffers, rateOffer, updateOfferStatus } from '../controllers/offerController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validId } from '../middlewares/security.js';

const router = Router();

router.get('/', requireAuth, getOffers);
router.post('/', requireAuth, requireRole('buyer'), createOffer);
router.patch('/:id/status', requireAuth, requireRole('farmer', 'buyer'), validId('id'), updateOfferStatus);
router.post('/:id/rating', requireAuth, requireRole('buyer'), validId('id'), rateOffer);

export default router;
