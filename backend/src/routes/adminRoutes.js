import { Router } from 'express';
import {
  getAdminListings,
  getAllUsers,
  getStats,
  setListingModeration,
  setUserVerification,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validId } from '../middlewares/security.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/verification', validId('id'), setUserVerification);
router.get('/listings', getAdminListings);
router.patch('/listings/:id/moderation', validId('id'), setListingModeration);

export default router;
