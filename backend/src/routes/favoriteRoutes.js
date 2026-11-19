import { Router } from 'express';
import { addFavorite, getFavorites, removeFavorite } from '../controllers/favoriteController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validId } from '../middlewares/security.js';

const router = Router();

router.get('/', requireAuth, getFavorites);
router.put('/:id', requireAuth, validId('id'), addFavorite);
router.delete('/:id', requireAuth, validId('id'), removeFavorite);

export default router;
