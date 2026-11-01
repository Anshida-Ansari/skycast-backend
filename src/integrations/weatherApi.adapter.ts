import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env.config.js';
import {
  AirQualityData,
  CurrentWeather,
  DailyForecastItem,
  GeocodingLocation,
  HourlyForecastItem,
  WeatherAlert,
} from '../types/weather.types.js';
import { IWeatherProvider, WeatherQueryOptions } from './weatherProvider.interface.js';
import { resolveWeatherApiCondition } from '../constants/weatherApiCodes.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';

export class WeatherApiAdapter implements IWeatherProvider {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.WEATHERAPI_KEY || '';
    this.client = axios.create({
      baseURL: env.WEATHERAPI_BASE_URL || 'https://api.weatherapi.com/v1',
      timeout: 12000,
      headers: {
        'User-Agent': 'SkyCast/1.0 (WeatherForecastingApp; SecondaryFallback)',
        Accept: 'application/json',
      },
    });
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new AppError(
        'WeatherAPI is not configured (missing WEATHERAPI_KEY in environment)',
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getCurrentWeather(options: WeatherQueryOptions): Promise<CurrentWeather> {
    this.ensureConfigured();
    try {
      const response = await this.client.get('/forecast.json', {
        params: {
          key: this.apiKey,
          q: `${options.latitude},${options.longitude}`,
          days: 1,
          aqi: 'no',
          alerts: 'no',
        },
      });

      const cur = response.data.current;
      const astro = response.data.forecast?.forecastday?.[0]?.astro;
      const isDay = cur.is_day === 1;
      const isImperial = options.units === 'imperial';

      return {
        temperature: Math.round((isImperial ? cur.temp_f : cur.temp_c) * 10) / 10,
        feelsLike: Math.round((isImperial ? cur.feelslike_f : cur.feelslike_c) * 10) / 10,
        humidity: cur.humidity,
        windSpeed: Math.round((isImperial ? cur.wind_mph : cur.wind_kph) * 10) / 10,
        windDirection: cur.wind_degree,
        windGusts: Math.round((isImperial ? cur.gust_mph : cur.gust_kph) * 10) / 10,
        pressure: Math.round(cur.pressure_mb),
        uvIndex: cur.uv ?? 0,
        visibility: isImperial ? cur.vis_miles : cur.vis_km,
        cloudCover: cur.cloud,
        precipitation: isImperial ? cur.precip_in : cur.precip_mm,
        condition: resolveWeatherApiCondition(cur.condition.code, cur.condition.text, isDay),
        sunrise: astro?.sunrise || '',
        sunset: astro?.sunset || '',
        timestamp: cur.last_updated || new Date().toISOString(),
      };
    } catch (error: any) {
      this.handleError('getCurrentWeather', error);
    }
  }

  async getHourlyForecast(options: WeatherQueryOptions): Promise<HourlyForecastItem[]> {
    this.ensureConfigured();
    try {
      const response = await this.client.get('/forecast.json', {
        params: {
          key: this.apiKey,
          q: `${options.latitude},${options.longitude}`,
          days: 2,
          aqi: 'no',
          alerts: 'no',
        },
      });

      const forecastDays = response.data.forecast?.forecastday || [];
      const allHours: any[] = [];
      for (const fDay of forecastDays) {
        if (fDay.hour && Array.isArray(fDay.hour)) {
          allHours.push(...fDay.hour);
        }
      }

      const isImperial = options.units === 'imperial';
      const nowEpoch = Math.floor(Date.now() / 1000) - 3600;

      // Filter to future hours starting around now, taking next 24-48 items
      const upcoming = allHours.filter((h: any) => h.time_epoch >= nowEpoch).slice(0, 24);
      const targetList = upcoming.length >= 12 ? upcoming : allHours.slice(0, 24);

      return targetList.map((h: any) => ({
        time: h.time,
        temperature: Math.round((isImperial ? h.temp_f : h.temp_c) * 10) / 10,
        feelsLike: Math.round((isImperial ? h.feelslike_f : h.feelslike_c) * 10) / 10,
        humidity: h.humidity,
        precipitationProbability: h.chance_of_rain ?? h.chance_of_snow ?? 0,
        precipitation: isImperial ? h.precip_in : h.precip_mm,
        windSpeed: Math.round((isImperial ? h.wind_mph : h.wind_kph) * 10) / 10,
        condition: resolveWeatherApiCondition(h.condition.code, h.condition.text, h.is_day === 1),
        uvIndex: h.uv ?? 0,
      }));
    } catch (error: any) {
      this.handleError('getHourlyForecast', error);
    }
  }

  async getDailyForecast(options: WeatherQueryOptions): Promise<DailyForecastItem[]> {
    this.ensureConfigured();
    try {
      const response = await this.client.get('/forecast.json', {
        params: {
          key: this.apiKey,
          q: `${options.latitude},${options.longitude}`,
          days: 7, // Requests up to 7 days (WeatherAPI free plan supplies available days, typically 3)
          aqi: 'no',
          alerts: 'no',
        },
      });

      const forecastDays = response.data.forecast?.forecastday || [];
      const isImperial = options.units === 'imperial';

      return forecastDays.map((d: any) => {
        const day = d.day;
        const precipProb = Math.max(day.daily_chance_of_rain || 0, day.daily_chance_of_snow || 0);

        return {
          date: d.date,
          maxTemperature: Math.round((isImperial ? day.maxtemp_f : day.maxtemp_c) * 10) / 10,
          minTemperature: Math.round((isImperial ? day.mintemp_f : day.mintemp_c) * 10) / 10,
          apparentMaxTemp: Math.round((isImperial ? day.maxtemp_f : day.maxtemp_c) * 10) / 10,
          apparentMinTemp: Math.round((isImperial ? day.mintemp_f : day.mintemp_c) * 10) / 10,
          precipitationSum: isImperial ? day.totalprecip_in : day.totalprecip_mm,
          precipitationProbabilityMax: precipProb,
          windSpeedMax: Math.round((isImperial ? day.maxwind_mph : day.maxwind_kph) * 10) / 10,
          condition: resolveWeatherApiCondition(day.condition.code, day.condition.text, true),
          sunrise: d.astro?.sunrise || '',
          sunset: d.astro?.sunset || '',
          uvIndexMax: day.uv ?? 0,
        };
      });
    } catch (error: any) {
      this.handleError('getDailyForecast', error);
    }
  }

  async getAirQuality(options: { latitude: number; longitude: number }): Promise<AirQualityData> {
    this.ensureConfigured();
    try {
      const response = await this.client.get('/current.json', {
        params: {
          key: this.apiKey,
          q: `${options.latitude},${options.longitude}`,
          aqi: 'yes',
        },
      });

      const aq = response.data.current?.air_quality;
      const epaIndex = aq?.['us-epa-index'] ?? 1;

      let aqiCategory: AirQualityData['aqiCategory'] = 'Good';
      let approxAqi = 25;

      switch (epaIndex) {
        case 1:
          aqiCategory = 'Good';
          approxAqi = 30;
          break;
        case 2:
          aqiCategory = 'Moderate';
          approxAqi = 65;
          break;
        case 3:
          aqiCategory = 'Unhealthy for Sensitive Groups';
          approxAqi = 120;
          break;
        case 4:
          aqiCategory = 'Unhealthy';
          approxAqi = 165;
          break;
        case 5:
          aqiCategory = 'Very Unhealthy';
          approxAqi = 220;
          break;
        case 6:
          aqiCategory = 'Hazardous';
          approxAqi = 310;
          break;
        default:
          aqiCategory = 'Good';
          approxAqi = 30;
      }

      return {
        aqi: approxAqi,
        aqiCategory,
        pm2_5: Math.round((aq?.pm2_5 ?? 10) * 10) / 10,
        pm10: Math.round((aq?.pm10 ?? 20) * 10) / 10,
        nitrogenDioxide: Math.round((aq?.no2 ?? 15) * 10) / 10,
        ozone: Math.round((aq?.o3 ?? 30) * 10) / 10,
        sulphurDioxide: Math.round((aq?.so2 ?? 5) * 10) / 10,
        carbonMonoxide: Math.round(aq?.co ?? 200),
        updatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.handleError('getAirQuality', error);
    }
  }

  async searchLocations(query: string): Promise<GeocodingLocation[]> {
    this.ensureConfigured();
    try {
      const response = await this.client.get('/search.json', {
        params: {
          key: this.apiKey,
          q: query.trim(),
        },
      });

      if (!Array.isArray(response.data)) {
        return [];
      }

      return response.data.map((item: any, idx: number) => ({
        id: item.id || idx + 1,
        name: item.name,
        latitude: item.lat,
        longitude: item.lon,
        country: item.country || '',
        countryCode: '',
        admin1: item.region,
        timezone: '',
        elevation: 0,
      }));
    } catch (error: any) {
      this.handleError('searchLocations', error);
    }
  }

  async getAlerts(options: { latitude: number; longitude: number }): Promise<WeatherAlert[]> {
    if (!this.isConfigured()) return [];
    try {
      const response = await this.client.get('/forecast.json', {
        params: {
          key: this.apiKey,
          q: `${options.latitude},${options.longitude}`,
          days: 1,
          alerts: 'yes',
        },
      });

      const alertList = response.data.alerts?.alert || [];
      return alertList.map((a: any, idx: number) => ({
        id: `weatherapi-alert-${idx}`,
        event: a.event || 'Severe Weather Warning',
        headline: a.headline || a.desc || '',
        description: a.desc || '',
        severity: (a.severity?.toLowerCase() as WeatherAlert['severity']) || 'moderate',
        effective: a.effective || new Date().toISOString(),
        expires: a.expires || new Date(Date.now() + 86400000).toISOString(),
      }));
    } catch {
      return [];
    }
  }

  private handleError(operation: string, error: any): never {
    const status = error.response?.status;
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message || 'Unknown WeatherAPI failure';

    logger.error('WeatherAPI %s error (HTTP %s): %s', operation, status, message);

    if (status === 401 || status === 403) {
      throw new AppError(
        'WeatherAPI authentication failed (invalid or expired API key)',
        502,
        ErrorCodes.WEATHER_PROVIDER_ERROR,
        { provider: 'WeatherAPI', status, reason: message }
      );
    }

    if (status === 429) {
      throw new AppError(
        'WeatherAPI rate limit or quota exceeded',
        429,
        ErrorCodes.TOO_MANY_REQUESTS,
        { provider: 'WeatherAPI', status, reason: message }
      );
    }

    throw new AppError(
      `Failed to retrieve weather data from secondary provider: ${message}`,
      status === 400 ? 400 : 502,
      ErrorCodes.WEATHER_PROVIDER_ERROR,
      { provider: 'WeatherAPI', status, reason: message }
    );
  }
}
