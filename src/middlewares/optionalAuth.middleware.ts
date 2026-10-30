import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token.js';

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
  } catch {
    // If token is invalid or expired, continue as guest without throwing an error
    req.user = undefined;
  }

  next();
};

