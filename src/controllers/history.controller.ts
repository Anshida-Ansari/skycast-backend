import { Request, Response, NextFunction } from 'express';
import { historyService } from '../services/history.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export class HistoryController {
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      const history = await historyService.getHistory(req.user.userId);
      sendSuccess(res, history, 200, { count: history.length });
    } catch (error) {
      next(error);
    }
  }

  async addHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      const record = await historyService.addHistory(req.user.userId, req.body);
      sendSuccess(res, record, 201, { message: 'Search history recorded' });
    } catch (error) {
      next(error);
    }
  }

  async syncHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      const result = await historyService.syncHistory(req.user.userId, req.body.items);
      sendSuccess(res, result.history, 200, {
        message: 'Search history synchronized successfully',
        syncedCount: result.syncedCount,
      });
    } catch (error) {
      next(error);
    }
  }

  async clearHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      await historyService.clearHistory(req.user.userId);
      sendSuccess(res, null, 200, { message: 'Search history cleared successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const historyController = new HistoryController();

