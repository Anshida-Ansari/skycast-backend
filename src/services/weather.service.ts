import { IWeatherProvider } from '../integrations/weatherProvider.interface.js';
import { FallbackWeatherProvider } from '../integrations/fallbackWeatherProvider.js';
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
  freshUntil: number;
  staleUntil: number;
}

export interface WeatherServiceResult<T> {
  data: T;
  cached: boolean;
  stale?: boolean;
}

export class WeatherService {
  private provider: IWeatherProvider;
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private inFlightRequests: Map<string, Promise<any>> = new Map();
  private cacheTtlMs: number;
  private staleTtlMs: number;

  constructor(provider?: IWeatherProvider) {
    this.provider = provider || new FallbackWeatherProvider();
    this.cacheTtlMs = env.CACHE_TTL_MINUTES * 60 * 1000;
    // Retain cached data for up to 24 hours as an emergency stale fallback
    this.staleTtlMs = 24 * 60 * 60 * 1000;
  }

  /**
   * Round coordinate to 2 decimal places to minimize redundant requests from GPS jitter (~1.1 km precision)
   */
  public normalizeCoordinate(coord: number): number {
    return Math.round(coord * 100) / 100;
  }

  private getFreshCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() <= entry.freshUntil) {
      return entry.data as T;
    }

    // Clean up if past stale window
    if (Date.now() > entry.staleUntil) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  private getStaleCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() <= entry.staleUntil) {
      return entry.data as T;
    }

    this.memoryCache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    const now = Date.now();
    this.memoryCache.set(key, {
      data,
      freshUntil: now + this.cacheTtlMs,
      staleUntil: now + this.staleTtlMs,
    });
  }

  /**
   * Coalesce simultaneous identical requests into a single in-flight promise
   */
  private async executeCoalesced<T>(
    cacheKey: string,
    fetcher: () => Promise<T>
  ): Promise<WeatherServiceResult<T>> {
    // 1. Return fresh cache if available
    const fresh = this.getFreshCache<T>(cacheKey);
    if (fresh) {
      logger.debug('Cache HIT (fresh) for %s', cacheKey);
      return { data: fresh, cached: true };
    }

    // 2. Coalesce in-flight requests to avoid concurrent duplicate provider calls
    let inFlight = this.inFlightRequests.get(cacheKey);
    if (!inFlight) {
      inFlight = (async () => {
        try {
          const freshData = await fetcher();
          this.setCache(cacheKey, freshData);
          return freshData;
        } finally {
          this.inFlightRequests.delete(cacheKey);
        }
      })();

      this.inFlightRequests.set(cacheKey, inFlight);
    } else {
      logger.debug('Coalescing in-flight request for %s', cacheKey);
    }

    try {
      const data = await inFlight;
      return { data, cached: false };
    } catch (error) {
      // 3. Stale cache fallback if both providers fail
      const stale = this.getStaleCache<T>(cacheKey);
      if (stale) {
        logger.warn('⚠️ Both weather providers failed. Serving STALE cache fallback for %s', cacheKey);
        return { data: stale, cached: true, stale: true };
      }

      throw error;
    }
  }

  async getCurrentWeather(
    rawLat: number,
    rawLon: number,
    units: UnitSystem = 'metric'
  ): Promise<WeatherServiceResult<CurrentWeather>> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `current:${lat}:${lon}:${units}`;

    return this.executeCoalesced(cacheKey, () =>
      this.provider.getCurrentWeather({ latitude: lat, longitude: lon, units })
    );
  }

  async getHourlyForecast(
    rawLat: number,
    rawLon: number,
    units: UnitSystem = 'metric'
  ): Promise<WeatherServiceResult<HourlyForecastItem[]>> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `hourly:${lat}:${lon}:${units}`;

    return this.executeCoalesced(cacheKey, () =>
      this.provider.getHourlyForecast({ latitude: lat, longitude: lon, units })
    );
  }

  async getDailyForecast(
    rawLat: number,
    rawLon: number,
    units: UnitSystem = 'metric'
  ): Promise<WeatherServiceResult<DailyForecastItem[]>> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `daily:${lat}:${lon}:${units}`;

    return this.executeCoalesced(cacheKey, () =>
      this.provider.getDailyForecast({ latitude: lat, longitude: lon, units })
    );
  }

  async getAirQuality(
    rawLat: number,
    rawLon: number
  ): Promise<WeatherServiceResult<AirQualityData>> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `aqi:${lat}:${lon}`;

    return this.executeCoalesced(cacheKey, () =>
      this.provider.getAirQuality({ latitude: lat, longitude: lon })
    );
  }

  async getFullForecast(
    rawLat: number,
    rawLon: number,
    units: UnitSystem = 'metric',
    city?: string,
    country?: string
  ): Promise<WeatherServiceResult<FullWeatherResponse>> {
    const lat = this.normalizeCoordinate(rawLat);
    const lon = this.normalizeCoordinate(rawLon);
    const cacheKey = `full:${lat}:${lon}:${units}`;

    return this.executeCoalesced(cacheKey, async () => {
      // Execute sub-requests concurrently through the provider (with fallback support per domain)
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

      return result;
    });
  }

  async searchLocations(query: string): Promise<GeocodingLocation[]> {
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cachedData = this.getFreshCache<GeocodingLocation[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const results = await this.provider.searchLocations(query);
    this.setCache(cacheKey, results);
    return results;
  }
}

export const weatherService = new WeatherService();
