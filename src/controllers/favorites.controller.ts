import { Request, Response, NextFunction } from 'express';
import { favoritesService } from '../services/favorites.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export class FavoritesController {
  async getFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      const favorites = await favoritesService.getFavorites(req.user.userId);
      sendSuccess(res, favorites, 200, { count: favorites.length });
    } catch (error) {
      next(error);
    }
  }

  async addFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      const favorite = await favoritesService.addFavorite(req.user.userId, req.body);
      sendSuccess(res, favorite, 201, { message: 'Location added to favourites' });
    } catch (error) {
      next(error);
    }
  }

  async deleteFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      await favoritesService.deleteFavorite(req.user.userId, req.params.id);
      sendSuccess(res, null, 200, { message: 'Location removed from favourites' });
    } catch (error) {
      next(error);
    }
  }

  async syncFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
      const result = await favoritesService.syncFavorites(req.user.userId, req.body.items);
      sendSuccess(res, result.favorites, 200, {
        message: 'Favourites synchronized successfully',
        addedCount: result.addedCount,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const favoritesController = new FavoritesController();

