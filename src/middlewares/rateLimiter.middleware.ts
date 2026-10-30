import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        'Too many requests from this IP address. Please try again after 15 minutes.',
        429,
        ErrorCodes.TOO_MANY_REQUESTS
      )
    );
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts for sensitive actions
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        'Too many authentication attempts. Please try again later.',
        429,
        ErrorCodes.TOO_MANY_REQUESTS
      )
    );
  },
});

