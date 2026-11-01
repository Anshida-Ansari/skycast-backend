import { IWeatherProvider, WeatherQueryOptions } from './weatherProvider.interface.js';
import { OpenMeteoAdapter } from './openMeteo.adapter.js';
import { WeatherApiAdapter } from './weatherApi.adapter.js';
import {
  AirQualityData,
  CurrentWeather,
  DailyForecastItem,
  GeocodingLocation,
  HourlyForecastItem,
  WeatherAlert,
} from '../types/weather.types.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';

export class FallbackWeatherProvider implements IWeatherProvider {
  private primary: IWeatherProvider;
  private secondary: WeatherApiAdapter;

  constructor(primary?: IWeatherProvider, secondary?: WeatherApiAdapter) {
    this.primary = primary || new OpenMeteoAdapter();
    this.secondary = secondary || new WeatherApiAdapter();

    if (this.secondary.isConfigured()) {
      logger.info('🛡️ Weather provider fallback initialized: Primary = Open-Meteo, Secondary = WeatherAPI (ACTIVE)');
    } else {
      logger.info('ℹ️ Weather provider initialized: Primary = Open-Meteo (WeatherAPI fallback key not set)');
    }
  }

  public isFallbackConfigured(): boolean {
    return this.secondary.isConfigured();
  }

  /**
   * Determine whether an error from the primary provider qualifies for secondary fallback.
   * Quota exhaustion, rate limiting (429), timeouts, and 502/503 network errors qualify.
   * Client validation errors (400) do NOT qualify.
   */
  private isEligibleForFallback(error: any): boolean {
    const status = error.statusCode || error.status || error.response?.status;
    const msg = (error.message || '').toLowerCase();
    const reason = (error.details?.reason || '').toLowerCase();

    // 400 Bad Request / Validation errors must NOT trigger fallback
    if (status === 400) return false;

    // Rate limiting / Quota exhaustion
    if (status === 429) return true;
    if (msg.includes('limit exceeded') || msg.includes('quota') || msg.includes('rate limit')) return true;
    if (reason.includes('limit exceeded') || reason.includes('quota') || reason.includes('rate limit')) return true;

    // Upstream / Provider Gateway Errors
    if (status === 502 || status === 503 || status === 504) return true;
    if (error.code === ErrorCodes.WEATHER_PROVIDER_ERROR) return true;

    // Network / Socket level errors
    if (msg.includes('econnrefused') || msg.includes('etimedout') || msg.includes('timeout') || msg.includes('network error')) {
      return true;
    }

    return false;
  }

  private async executeWithFallback<T>(
    operationName: string,
    primaryFn: () => Promise<T>,
    secondaryFn: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryFn();
    } catch (primaryError: any) {
      if (this.isEligibleForFallback(primaryError) && this.secondary.isConfigured()) {
        const errorReason = primaryError.details?.reason || primaryError.message || 'Rate limit / provider error';
        logger.warn(
          '⚠️ Primary provider (Open-Meteo) failed for %s [%s]. Seamlessly falling back to WeatherAPI...',
          operationName,
          errorReason
        );

        try {
          const result = await secondaryFn();
          logger.info('✅ Successfully served %s using secondary provider (WeatherAPI)', operationName);
          return result;
        } catch (secondaryError: any) {
          logger.error(
            '❌ Both primary (Open-Meteo) and secondary (WeatherAPI) failed for %s. Secondary error: %s',
            operationName,
            secondaryError.message
          );
          throw new AppError(
            `Weather data unavailable: both meteorological providers failed (${secondaryError.message})`,
            502,
            ErrorCodes.WEATHER_PROVIDER_ERROR,
            { primary: errorReason, secondary: secondaryError.message }
          );
        }
      }

      if (!this.secondary.isConfigured() && this.isEligibleForFallback(primaryError)) {
        logger.warn(
          '⚠️ Primary provider failed (%s), but secondary provider (WeatherAPI) is not configured. Add WEATHERAPI_KEY in environment to enable automatic fallback.',
          primaryError.message
        );
      }

      throw primaryError;
    }
  }

  async getCurrentWeather(options: WeatherQueryOptions): Promise<CurrentWeather> {
    return this.executeWithFallback(
      'getCurrentWeather',
      () => this.primary.getCurrentWeather(options),
      () => this.secondary.getCurrentWeather(options)
    );
  }

  async getHourlyForecast(options: WeatherQueryOptions): Promise<HourlyForecastItem[]> {
    return this.executeWithFallback(
      'getHourlyForecast',
      () => this.primary.getHourlyForecast(options),
      () => this.secondary.getHourlyForecast(options)
    );
  }

  async getDailyForecast(options: WeatherQueryOptions): Promise<DailyForecastItem[]> {
    return this.executeWithFallback(
      'getDailyForecast',
      () => this.primary.getDailyForecast(options),
      () => this.secondary.getDailyForecast(options)
    );
  }

  async getAirQuality(options: { latitude: number; longitude: number }): Promise<AirQualityData> {
    return this.executeWithFallback(
      'getAirQuality',
      () => this.primary.getAirQuality(options),
      () => this.secondary.getAirQuality(options)
    );
  }

  async searchLocations(query: string): Promise<GeocodingLocation[]> {
    return this.executeWithFallback(
      'searchLocations',
      () => this.primary.searchLocations(query),
      () => this.secondary.searchLocations(query)
    );
  }

  async getAlerts(options: { latitude: number; longitude: number }): Promise<WeatherAlert[]> {
    return this.executeWithFallback(
      'getAlerts',
      () => this.primary.getAlerts(options),
      () => this.secondary.getAlerts(options)
    );
  }
}

