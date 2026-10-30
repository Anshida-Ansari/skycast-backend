import { z } from 'zod';

export const favoriteItemSchema = z.object({
  cityName: z
    .string({ required_error: 'City name is required' })
    .trim()
    .min(1, { message: 'City name cannot be empty' }),
  country: z
    .string({ required_error: 'Country is required' })
    .trim()
    .min(1, { message: 'Country cannot be empty' }),
  region: z.string().trim().optional(),
  coordinates: z.object({
    latitude: z
      .number({ required_error: 'Latitude is required' })
      .min(-90, { message: 'Latitude must be between -90 and 90' })
      .max(90, { message: 'Latitude must be between -90 and 90' }),
    longitude: z
      .number({ required_error: 'Longitude is required' })
      .min(-180, { message: 'Longitude must be between -180 and 180' })
      .max(180, { message: 'Longitude must be between -180 and 180' }),
  }),
  customLabel: z.string().trim().max(50).optional(),
});

export const addFavoriteSchema = z.object({
  body: favoriteItemSchema,
});

export const syncFavoritesSchema = z.object({
  body: z.object({
    items: z.array(favoriteItemSchema, {
      required_error: 'Items array is required for synchronization',
    }),
  }),
});

