import { z } from 'zod';

export const historyItemSchema = z.object({
  query: z
    .string({ required_error: 'Query string is required' })
    .trim()
    .min(1, { message: 'Query cannot be empty' })
    .max(100, { message: 'Query cannot exceed 100 characters' }),
  resolvedCity: z
    .string({ required_error: 'Resolved city name is required' })
    .trim()
    .min(1, { message: 'Resolved city cannot be empty' }),
  country: z
    .string({ required_error: 'Country is required' })
    .trim()
    .min(1, { message: 'Country cannot be empty' }),
  coordinates: z.object({
    latitude: z
      .number({ required_error: 'Latitude is required' })
      .min(-90)
      .max(90),
    longitude: z
      .number({ required_error: 'Longitude is required' })
      .min(-180)
      .max(180),
  }),
});

export const addHistorySchema = z.object({
  body: historyItemSchema,
});

export const syncHistorySchema = z.object({
  body: z.object({
    items: z.array(historyItemSchema, {
      required_error: 'Items array is required for synchronization',
    }),
  }),
});

