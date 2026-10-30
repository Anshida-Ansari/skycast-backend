import { IWeatherProvider } from '../integrations/weatherProvider.interface.js';
import { OpenMeteoAdapter } from '../integrations/openMeteo.adapter.js';
import {
  AirQualityData,
  CurrentWeather,
  DailyForecastItem,
  FullWeatherResponse,
  GeocodingLocation,
  HourlyForecastItem,
  UnitSystem,
} from '../types/weather.types.js';
import { env } from '../config/env.config.js';
import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class WeatherService {
  private provider: IWeatherProvider;
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private cacheTtlMs: number;

  constructor(provider?: IWeatherProvider) {
    this.provider = provider || new OpenMeteoAdapter();
    this.cacheTtlMs = env.CACHE_TTL_MINUTES * 60 * 1000;
  }

  /**
   * Round coordinate to 2 decimal places to minimize redundant requests from GPS jitter (~1.1 km precision)
   */
  public normalizeCoordinate(coord: number): number {
    return Math.round(coord * 100) / 100;
  }

  private getCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  async getCurrentWeather(
    rawLat: number,
    rawLon: number,
    units: UnitSystem = 'metric'
  ): Promise<{ data: CurrentWeather; cached: boolean }> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `current:${lat}:${lon}:${units}`;

    const cachedData = this.getCache<CurrentWeather>(cacheKey);
    if (cachedData) {
      logger.debug('Cache hit for %s', cacheKey);
      return { data: cachedData, cached: true };
    }

    const data = await this.provider.getCurrentWeather({ latitude: lat, longitude: lon, units });
    this.setCache(cacheKey, data);
    return { data, cached: false };
  }

  async getHourlyForecast(
    rawLat: number,
    rawLon: number,
    units: UnitSystem = 'metric'
  ): Promise<{ data: HourlyForecastItem[]; cached: boolean }> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `hourly:${lat}:${lon}:${units}`;

    const cachedData = this.getCache<HourlyForecastItem[]>(cacheKey);
    if (cachedData) {
      return { data: cachedData, cached: true };
    }

    const data = await this.provider.getHourlyForecast({ latitude: lat, longitude: lon, units });
    this.setCache(cacheKey, data);
    return { data, cached: false };
  }

  async getDailyForecast(
    rawLat: number,
    rawLon: number,
    units: UnitSystem = 'metric'
  ): Promise<{ data: DailyForecastItem[]; cached: boolean }> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `daily:${lat}:${lon}:${units}`;

    const cachedData = this.getCache<DailyForecastItem[]>(cacheKey);
    if (cachedData) {
      return { data: cachedData, cached: true };
    }

    const data = await this.provider.getDailyForecast({ latitude: lat, longitude: lon, units });
    this.setCache(cacheKey, data);
    return { data, cached: false };
  }

  async getAirQuality(
    rawLat: number,
    rawLon: number
  ): Promise<{ data: AirQualityData; cached: boolean }> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `aqi:${lat}:${lon}`;

    const cachedData = this.getCache<AirQualityData>(cacheKey);
    if (cachedData) {
      return { data: cachedData, cached: true };
    }

    const data = await this.provider.getAirQuality({ latitude: lat, longitude: lon });
    this.setCache(cacheKey, data);
    return { data, cached: false };
  }

  async getFullForecast(
    rawLat: number,
    rawLon: number,
    units: UnitSystem = 'metric',
    city?: string,
    country?: string
  ): Promise<{ data: FullWeatherResponse; cached: boolean }> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `full:${lat}:${lon}:${units}`;

    const cachedData = this.getCache<FullWeatherResponse>(cacheKey);
    if (cachedData) {
      return { data: cachedData, cached: true };
    }

    // Concurrent execution of independent data sets
    const [current, hourly, daily, airQuality, alerts] = await Promise.all([
      this.provider.getCurrentWeather({ latitude: lat, longitude: lon, units }),
      this.provider.getHourlyForecast({ latitude: lat, longitude: lon, units }),
      this.provider.getDailyForecast({ latitude: lat, longitude: lon, units }),
      this.provider.getAirQuality({ latitude: lat, longitude: lon }),
      this.provider.getAlerts({ latitude: lat, longitude: lon }),
    ]);

    const result: FullWeatherResponse = {
      location: {
        latitude: lat,
        longitude: lon,
        timezone: 'auto',
        city,
        country,
      },
      units,
      current,
      hourly,
      daily,
      airQuality,
      alerts,
    };

    this.setCache(cacheKey, result);
    return { data: result, cached: false };
  }

  async searchLocations(query: string): Promise<GeocodingLocation[]> {
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cachedData = this.getCache<GeocodingLocation[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const results = await this.provider.searchLocations(query);
    this.setCache(cacheKey, results);
    return results;
  }
}

export const weatherService = new WeatherService();

