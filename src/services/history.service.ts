import { Types } from 'mongoose';
import { SearchHistory, ISearchHistory } from '../models/searchHistory.model.js';

export interface AddHistoryDTO {
  query: string;
  resolvedCity: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

const MAX_HISTORY_ITEMS = 20;

export class HistoryService {
  async getHistory(userId: string): Promise<ISearchHistory[]> {
    return SearchHistory.find({ userId: new Types.ObjectId(userId) })
      .sort({ searchedAt: -1 })
      .limit(MAX_HISTORY_ITEMS);
  }

  async addHistory(userId: string, data: AddHistoryDTO): Promise<ISearchHistory> {
    const userObjectId = new Types.ObjectId(userId);
    const normalizedQuery = data.query.trim().toLowerCase();

    // Check if user recently searched this same query (case-insensitive)
    const existing = await SearchHistory.findOne({
      userId: userObjectId,
      query: { $regex: new RegExp(`^${normalizedQuery}$`, 'i') },
    });

    let record: ISearchHistory;

    if (existing) {
      // Update searchedAt timestamp and resolve details to bring it to the top
      existing.searchedAt = new Date();
      existing.resolvedCity = data.resolvedCity;
      existing.country = data.country;
      existing.coordinates = data.coordinates;
      record = await existing.save();
    } else {
      record = await SearchHistory.create({
        userId: userObjectId,
        query: data.query.trim(),
        resolvedCity: data.resolvedCity,
        country: data.country,
        coordinates: data.coordinates,
        searchedAt: new Date(),
      });
    }

    // Maintain max 20 history records per user
    const totalCount = await SearchHistory.countDocuments({ userId: userObjectId });
    if (totalCount > MAX_HISTORY_ITEMS) {
      const excessRecords = await SearchHistory.find({ userId: userObjectId })
        .sort({ searchedAt: -1 })
        .skip(MAX_HISTORY_ITEMS)
        .select('_id');

      if (excessRecords.length > 0) {
        await SearchHistory.deleteMany({
          _id: { $in: excessRecords.map((r) => r._id) },
        });
      }
    }

    return record;
  }

  async syncHistory(
    userId: string,
    items: AddHistoryDTO[]
  ): Promise<{ syncedCount: number; history: ISearchHistory[] }> {
    let syncedCount = 0;
    for (const item of items) {
      await this.addHistory(userId, item);
      syncedCount++;
    }

    const history = await this.getHistory(userId);
    return { syncedCount, history };
  }

  async clearHistory(userId: string): Promise<void> {
    await SearchHistory.deleteMany({ userId: new Types.ObjectId(userId) });
  }
}

export const historyService = new HistoryService();

