import { Schema, model, Document, Types } from 'mongoose';

export interface ISearchHistory extends Document {
  userId: Types.ObjectId;
  query: string;
  resolvedCity: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  searchedAt: Date;
}

const searchHistorySchema = new Schema<ISearchHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: [true, 'Query is required'],
      trim: true,
      maxlength: 100,
    },
    resolvedCity: {
      type: String,
      required: [true, 'Resolved city name is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country name is required'],
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },
    searchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index to quickly retrieve and sort searches by user and date
searchHistorySchema.index({ userId: 1, searchedAt: -1 });

export const SearchHistory = model<ISearchHistory>('SearchHistory', searchHistorySchema);
