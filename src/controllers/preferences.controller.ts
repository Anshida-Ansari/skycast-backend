import { Request, Response, NextFunction } from 'express';
import { preferencesService } from '../services/preferences.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export class PreferencesController {
  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      const preferences = await preferencesService.getPreferences(req.user.userId);
      sendSuccess(res, preferences, 200);
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      const preferences = await preferencesService.updatePreferences(req.user.userId, req.body);
      sendSuccess(res, preferences, 200, { message: 'Preferences updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const preferencesController = new PreferencesController();

