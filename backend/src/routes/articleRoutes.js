import { Router } from 'express';
import { createArticle, deleteArticle, getArticles } from '../controllers/articleController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validId } from '../middlewares/security.js';

const router = Router();

router.get('/', getArticles);
router.post('/', requireAuth, requireRole('admin'), createArticle);
router.delete('/:id', requireAuth, requireRole('admin'), validId('id'), deleteArticle);

export default router;
