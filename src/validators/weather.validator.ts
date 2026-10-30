import { z } from 'zod';

export const coordinatesQuerySchema = z.object({
  query: z.object({
    lat: z
      .string()
      .transform((val) => parseFloat(val))
      .refine((val) => !isNaN(val) && val >= -90 && val <= 90, {
        message: 'Latitude must be a valid number between -90 and 90',
      }),
    lon: z
      .string()
      .transform((val) => parseFloat(val))
      .refine((val) => !isNaN(val) && val >= -180 && val <= 180, {
        message: 'Longitude must be a valid number between -180 and 180',
      }),
    units: z.enum(['metric', 'imperial']).optional().default('metric'),
    city: z.string().optional(),
    country: z.string().optional(),
  }),
});

export const locationSearchQuerySchema = z.object({
  query: z.object({
    q: z
      .string()
      .trim()
      .min(2, { message: 'Search query must be at least 2 characters long' })
      .max(100, { message: 'Search query must not exceed 100 characters' }),
  }),
});

