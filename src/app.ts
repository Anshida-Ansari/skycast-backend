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

  // 1. Production Reverse Proxy Trust (Required for Render, Vercel, rate limiting & secure cookies)
  app.set('trust proxy', 1);

  // 2. Security HTTP headers
  app.use(helmet());

  // 3. Robust Production & Preview CORS configuration
  const configuredOrigins = (env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const localDevOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  // Specific SkyCast Vercel project preview regex (e.g. skycast-git-feat.vercel.app or skycast.vercel.app)
  const skycastVercelPattern = /^https:\/\/skycast(-[a-zA-Z0-9_-]+)?\.vercel\.app$/;

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow server-to-server, curl, mobile, or Render health check probes with no origin
        if (!requestOrigin) {
          return callback(null, true);
        }

        // Allow configured origins (from env.CORS_ORIGIN)
        if (configuredOrigins.includes(requestOrigin)) {
          return callback(null, true);
        }

        // Allow local development origins
        if (localDevOrigins.includes(requestOrigin)) {
          return callback(null, true);
        }

        // Allow Vercel preview deployments only for the SkyCast project
        if (skycastVercelPattern.test(requestOrigin)) {
          return callback(null, true);
        }

        // Reject other origins
        return callback(
          new AppError(`Origin ${requestOrigin} is not allowed by CORS policy`, 403, ErrorCodes.FORBIDDEN)
        );
      },
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

