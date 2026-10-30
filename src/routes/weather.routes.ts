import { Router } from 'express';
import { weatherController } from '../controllers/weather.controller.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  coordinatesQuerySchema,
  locationSearchQuerySchema,
} from '../validators/weather.validator.js';

const router = Router();

// GET /api/v1/weather/current
router.get(
  '/current',
  validateRequest(coordinatesQuerySchema),
  weatherController.getCurrentWeather.bind(weatherController)
);

// GET /api/v1/weather/hourly
router.get(
  '/hourly',
  validateRequest(coordinatesQuerySchema),
  weatherController.getHourlyForecast.bind(weatherController)
);

// GET /api/v1/weather/daily
router.get(
  '/daily',
  validateRequest(coordinatesQuerySchema),
  weatherController.getDailyForecast.bind(weatherController)
);

// GET /api/v1/weather/air-quality
router.get(
  '/air-quality',
  validateRequest(coordinatesQuerySchema),
  weatherController.getAirQuality.bind(weatherController)
);

// GET /api/v1/weather/full - aggregates current, hourly, daily, aqi, and alerts in one fast payload
router.get(
  '/full',
  validateRequest(coordinatesQuerySchema),
  weatherController.getFullForecast.bind(weatherController)
);

// GET /api/v1/weather/search
router.get(
  '/search',
  validateRequest(locationSearchQuerySchema),
  weatherController.searchLocations.bind(weatherController)
);

export const weatherRoutes = router;

