import { Router } from 'express';
import { getMe, login, logout, refresh, register } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireTrustedOrigin } from '../middlewares/security.js';
import { loginIpLimiter, loginPhoneLimiter, refreshLimiter, registerLimiter } from '../middlewares/rateLimit.js';

const router = Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginIpLimiter, loginPhoneLimiter, login);
// Cookie-authenticated: only accept them from our own origins (CSRF defence in depth on top of SameSite).
router.post('/refresh', requireTrustedOrigin, refreshLimiter, refresh);
router.post('/logout', requireTrustedOrigin, logout);
router.get('/me', requireAuth, getMe);

export default router;
