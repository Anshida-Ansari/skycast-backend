import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  body: z.object({
    unitSystem: z.enum(['metric', 'imperial']).optional(),
    defaultCity: z.string().trim().max(70).optional(),
    defaultCoordinates: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
    enableAlerts: z.boolean().optional(),
  }),
});

