import { Request, Response, NextFunction } from 'express';
import { weatherService } from '../services/weather.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { UnitSystem } from '../types/weather.types.js';

export class WeatherController {
  async getCurrentWeather(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      const units = (req.query.units as UnitSystem) || 'metric';

      const result = await weatherService.getCurrentWeather(lat, lon, units);
      sendSuccess(res, result.data, 200, { cached: result.cached, ...(result.stale ? { stale: true } : {}) });
    } catch (error) {
      next(error);
    }
  }

  async getHourlyForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      const units = (req.query.units as UnitSystem) || 'metric';

      const result = await weatherService.getHourlyForecast(lat, lon, units);
      sendSuccess(res, result.data, 200, { cached: result.cached, ...(result.stale ? { stale: true } : {}) });
    } catch (error) {
      next(error);
    }
  }

  async getDailyForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      const units = (req.query.units as UnitSystem) || 'metric';

      const result = await weatherService.getDailyForecast(lat, lon, units);
      sendSuccess(res, result.data, 200, { cached: result.cached, ...(result.stale ? { stale: true } : {}) });
    } catch (error) {
      next(error);
    }
  }

  async getAirQuality(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);

      const result = await weatherService.getAirQuality(lat, lon);
      sendSuccess(res, result.data, 200, { cached: result.cached, ...(result.stale ? { stale: true } : {}) });
    } catch (error) {
      next(error);
    }
  }

  async getFullForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      const units = (req.query.units as UnitSystem) || 'metric';
      const city = req.query.city as string | undefined;
      const country = req.query.country as string | undefined;

      const result = await weatherService.getFullForecast(lat, lon, units, city, country);
      sendSuccess(res, result.data, 200, { cached: result.cached, ...(result.stale ? { stale: true } : {}) });
    } catch (error) {
      next(error);
    }
  }

  async searchLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      const results = await weatherService.searchLocations(query);
      sendSuccess(res, results, 200, { count: results.length });
    } catch (error) {
      next(error);
    }
  }
}

export const weatherController = new WeatherController();

