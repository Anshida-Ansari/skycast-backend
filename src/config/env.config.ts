import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/skycast'),
  JWT_SECRET: z.string().default('super_secret_jwt_key_skycast_dev_mode_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OPEN_METEO_BASE_URL: z.string().url().default('https://api.open-meteo.com/v1'),
  OPEN_METEO_GEO_URL: z.string().url().default('https://geocoding-api.open-meteo.com/v1'),
  OPEN_METEO_AIR_URL: z.string().url().default('https://air-quality-api.open-meteo.com/v1'),
  WEATHERAPI_KEY: z.string().optional(),
  WEATHERAPI_BASE_URL: z.string().url().default('https://api.weatherapi.com/v1'),
  CACHE_TTL_MINUTES: z.string().default('15').transform((val) => parseInt(val, 10)),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables configuration:', parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
};

export const env = parseEnv();

