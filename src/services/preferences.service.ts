import { Types } from 'mongoose';
import { UserPreference, IUserPreference } from '../models/userPreference.model.js';
import { UnitSystem } from '../types/weather.types.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export interface UpdatePreferencesDTO {
  unitSystem?: UnitSystem;
  defaultCity?: string;
  defaultCoordinates?: {
    latitude: number;
    longitude: number;
  };
  enableAlerts?: boolean;
}

export class PreferencesService {
  async getPreferences(userId: string): Promise<IUserPreference> {
    const preferences = await UserPreference.findOne({ userId: new Types.ObjectId(userId) });
    if (!preferences) {
      // Create if missing
      return UserPreference.create({
        userId: new Types.ObjectId(userId),
        unitSystem: 'metric',
        enableAlerts: true,
      });
    }
    return preferences;
  }

  async updatePreferences(userId: string, data: UpdatePreferencesDTO): Promise<IUserPreference> {
    const userObjectId = new Types.ObjectId(userId);

    const updateFields: Partial<IUserPreference> = {};
    if (data.unitSystem !== undefined) updateFields.unitSystem = data.unitSystem;
    if (data.defaultCity !== undefined) updateFields.defaultCity = data.defaultCity;
    if (data.defaultCoordinates !== undefined) updateFields.defaultCoordinates = data.defaultCoordinates;
    if (data.enableAlerts !== undefined) updateFields.enableAlerts = data.enableAlerts;

    const updated = await UserPreference.findOneAndUpdate(
      { userId: userObjectId },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    if (!updated) {
      throw new AppError('Failed to update user preferences', 500, ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    return updated;
  }
}

export const preferencesService = new PreferencesService();

