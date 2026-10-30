import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import { AuthUserPayload } from '../types/express.d.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export const generateToken = (payload: AuthUserPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): AuthUserPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Authentication token has expired', 401, ErrorCodes.UNAUTHORIZED);
    }
    throw new AppError('Invalid authentication token', 401, ErrorCodes.UNAUTHORIZED);
  }
};

