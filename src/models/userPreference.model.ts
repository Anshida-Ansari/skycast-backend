import { Schema, model, Document, Types } from 'mongoose';
import { UnitSystem } from '../types/weather.types.js';

export interface IUserPreference extends Document {
  userId: Types.ObjectId;
  unitSystem: UnitSystem;
  defaultCity?: string;
  defaultCoordinates?: {
    latitude: number;
    longitude: number;
  };
  enableAlerts: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    unitSystem: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
    },
    defaultCity: {
      type: String,
      trim: true,
      default: undefined,
    },
    defaultCoordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    enableAlerts: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
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

export const UserPreference = model<IUserPreference>('UserPreference', userPreferenceSchema);
