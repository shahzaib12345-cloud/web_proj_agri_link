import { Router } from 'express';
import { createListing, deleteListing, getListings, getMyListings } from '../controllers/listingController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validId } from '../middlewares/security.js';

const router = Router();

router.get('/', getListings);
router.get('/mine', requireAuth, requireRole('farmer'), getMyListings);
router.post('/', requireAuth, requireRole('farmer'), createListing);
router.delete('/:id', requireAuth, requireRole('farmer', 'admin'), validId('id'), deleteListing);

export default router;
