import { Schema, model, Document, Types } from 'mongoose';

export interface IFavouriteLocation extends Document {
  userId: Types.ObjectId;
  cityName: string;
  country: string;
  region?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  customLabel?: string;
  createdAt: Date;
}

const favouriteLocationSchema = new Schema<IFavouriteLocation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cityName: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country name is required'],
      trim: true,
    },
    region: {
      type: String,
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
    customLabel: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    createdAt: {
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

// Compound index to prevent duplicate saves for the same coordinates per user
favouriteLocationSchema.index(
  {
    userId: 1,
    'coordinates.latitude': 1,
    'coordinates.longitude': 1,
  },
  { unique: true }
);

// Index to retrieve user's favorites in order
favouriteLocationSchema.index({ userId: 1, createdAt: -1 });

export const FavouriteLocation = model<IFavouriteLocation>(
  'FavouriteLocation',
  favouriteLocationSchema
);
