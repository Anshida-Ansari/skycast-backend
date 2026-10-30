import { Router } from 'express';
import { weatherRoutes } from './weather.routes.js';
import { authRoutes } from './auth.routes.js';
import { favoritesRoutes } from './favorites.routes.js';
import { historyRoutes } from './history.routes.js';
import { preferencesRoutes } from './preferences.routes.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { optionalAuth } from '../middlewares/optionalAuth.middleware.js';
import { getDatabaseHealth } from '../config/database.js';

const apiRouter = Router();

// Health check endpoint reporting service & database status
apiRouter.get('/health', (_req, res) => {
  const dbHealth = getDatabaseHealth();
  sendSuccess(res, {
    status: dbHealth.status === 'connected' ? 'healthy' : 'degraded',
    service: 'skycast-api',
    database: dbHealth,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes (register, login, me)
apiRouter.use('/auth', authRoutes);

// Public weather routes (optionalAuth ensures guest access is 100% unimpeded while identifying logged in users)
apiRouter.use('/weather', optionalAuth, weatherRoutes);

// Authenticated user resources
apiRouter.use('/favorites', favoritesRoutes);
apiRouter.use('/history', historyRoutes);
apiRouter.use('/preferences', preferencesRoutes);

export { apiRouter };
