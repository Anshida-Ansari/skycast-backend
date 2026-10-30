import { Router } from 'express';
import { historyController } from '../controllers/history.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { addHistorySchema, syncHistorySchema } from '../validators/history.validator.js';

const router = Router();

// All history routes require authentication
router.use(requireAuth);

// GET /api/v1/history
router.get('/', historyController.getHistory.bind(historyController));

// POST /api/v1/history
router.post(
  '/',
  validateRequest(addHistorySchema),
  historyController.addHistory.bind(historyController)
);

// POST /api/v1/history/sync
router.post(
  '/sync',
  validateRequest(syncHistorySchema),
  historyController.syncHistory.bind(historyController)
);

// DELETE /api/v1/history
router.delete('/', historyController.clearHistory.bind(historyController));

export const historyRoutes = router;

