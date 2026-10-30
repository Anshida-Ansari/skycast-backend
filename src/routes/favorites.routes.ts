import { Router } from 'express';
import { favoritesController } from '../controllers/favorites.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { addFavoriteSchema, syncFavoritesSchema } from '../validators/favorites.validator.js';

const router = Router();

// All favorite routes require authentication
router.use(requireAuth);

// GET /api/v1/favorites
router.get('/', favoritesController.getFavorites.bind(favoritesController));

// POST /api/v1/favorites
router.post(
  '/',
  validateRequest(addFavoriteSchema),
  favoritesController.addFavorite.bind(favoritesController)
);

// DELETE /api/v1/favorites/:id
router.delete('/:id', favoritesController.deleteFavorite.bind(favoritesController));

// POST /api/v1/favorites/sync
router.post(
  '/sync',
  validateRequest(syncFavoritesSchema),
  favoritesController.syncFavorites.bind(favoritesController)
);

export const favoritesRoutes = router;

