import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { strictRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  strictRateLimiter,
  validateRequest(registerSchema),
  authController.register.bind(authController)
);

// POST /api/v1/auth/login
router.post(
  '/login',
  strictRateLimiter,
  validateRequest(loginSchema),
  authController.login.bind(authController)
);

// GET /api/v1/auth/me
router.get('/me', requireAuth, authController.getMe.bind(authController));

export const authRoutes = router;

