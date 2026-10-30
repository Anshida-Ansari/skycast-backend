import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, 201, { message: 'User registered successfully' });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 200, { message: 'Authentication successful' });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      }
      const result = await authService.getMe(req.user.userId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

