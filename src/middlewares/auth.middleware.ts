import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(
      'Authentication required. Please provide a valid Bearer token.',
      401,
      ErrorCodes.UNAUTHORIZED
    );
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new AppError(
      'Authentication token missing from Bearer header',
      401,
      ErrorCodes.UNAUTHORIZED
    );
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

