import { Router } from 'express';
import { preferencesController } from '../controllers/preferences.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { updatePreferencesSchema } from '../validators/preferences.validator.js';

const router = Router();

// All preferences routes require authentication
router.use(requireAuth);

// GET /api/v1/preferences
router.get('/', preferencesController.getPreferences.bind(preferencesController));

// PUT /api/v1/preferences
router.put(
  '/',
  validateRequest(updatePreferencesSchema),
  preferencesController.updatePreferences.bind(preferencesController)
);

export const preferencesRoutes = router;

