import { Types } from 'mongoose';
import { FavouriteLocation, IFavouriteLocation } from '../models/favouriteLocation.model.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export interface AddFavoriteDTO {
  cityName: string;
  country: string;
  region?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  customLabel?: string;
}

export class FavoritesService {
  async getFavorites(userId: string): Promise<IFavouriteLocation[]> {
    return FavouriteLocation.find({ userId: new Types.ObjectId(userId) }).sort({
      createdAt: -1,
    });
  }

  async addFavorite(userId: string, data: AddFavoriteDTO): Promise<IFavouriteLocation> {
    const userObjectId = new Types.ObjectId(userId);
    const lat = Math.round(data.coordinates.latitude * 100) / 100;
    const lon = Math.round(data.coordinates.longitude * 100) / 100;

    // Check for existing location within ~1.1km of coordinates for this user
    const existing = await FavouriteLocation.findOne({
      userId: userObjectId,
      'coordinates.latitude': lat,
      'coordinates.longitude': lon,
    });

    if (existing) {
      throw new AppError(
        'This location is already saved in your favorites',
        409,
        ErrorCodes.CONFLICT
      );
    }

    try {
      const favorite = await FavouriteLocation.create({
        userId: userObjectId,
        cityName: data.cityName,
        country: data.country,
        region: data.region,
        coordinates: {
          latitude: lat,
          longitude: lon,
        },
        customLabel: data.customLabel,
      });

      return favorite;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new AppError(
          'This location is already saved in your favorites',
          409,
          ErrorCodes.CONFLICT
        );
      }
      throw err;
    }
  }

  async deleteFavorite(userId: string, favoriteId: string): Promise<void> {
    if (!Types.ObjectId.isValid(favoriteId)) {
      throw new AppError('Invalid favorite location ID format', 400, ErrorCodes.BAD_REQUEST);
    }

    const favorite = await FavouriteLocation.findById(favoriteId);
    if (!favorite) {
      throw new AppError('Favourite location not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Strict ownership verification: prevent users from deleting another user's favorite
    if (favorite.userId.toString() !== userId) {
      throw new AppError(
        'You are not authorized to delete this favourite location',
        403,
        ErrorCodes.FORBIDDEN
      );
    }

    await FavouriteLocation.deleteOne({ _id: favorite._id });
  }

  async syncFavorites(
    userId: string,
    items: AddFavoriteDTO[]
  ): Promise<{ addedCount: number; favorites: IFavouriteLocation[] }> {
    const userObjectId = new Types.ObjectId(userId);
    let addedCount = 0;

    for (const item of items) {
      const lat = Math.round(item.coordinates.latitude * 100) / 100;
      const lon = Math.round(item.coordinates.longitude * 100) / 100;

      const existing = await FavouriteLocation.findOne({
        userId: userObjectId,
        'coordinates.latitude': lat,
        'coordinates.longitude': lon,
      });

      if (!existing) {
        await FavouriteLocation.create({
          userId: userObjectId,
          cityName: item.cityName,
          country: item.country,
          region: item.region,
          coordinates: { latitude: lat, longitude: lon },
          customLabel: item.customLabel,
        });
        addedCount++;
      }
    }

    const favorites = await this.getFavorites(userId);
    return { addedCount, favorites };
  }
}

export const favoritesService = new FavoritesService();

