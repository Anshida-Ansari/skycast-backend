import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.config.js';
import { apiRouter } from './routes/index.js';
import { standardRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler } from './errors/errorHandler.js';
import { AppError } from './errors/AppError.js';
import { ErrorCodes } from './constants/errorCodes.js';

export const createApp = (): Application => {
  const app = express();

  // 1. Security HTTP headers
  app.use(helmet());

  // 2. CORS configuration
  app.use(
    cors({
      origin: [env.CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 3. Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Request logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // 5. Rate limiting
  app.use(standardRateLimiter);

  // 6. Base Root Welcome
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'SkyCast Weather API',
      version: '1.0.0',
      status: 'active',
      docs: '/api/v1/health',
    });
  });

  // 7. Mount API v1 router
  app.use('/api/v1', apiRouter);

  // 8. Handle 404 Route Not Found
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(
      new AppError(
        `Route ${req.method} ${req.originalUrl} not found`,
        404,
        ErrorCodes.NOT_FOUND
      )
    );
  });

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

