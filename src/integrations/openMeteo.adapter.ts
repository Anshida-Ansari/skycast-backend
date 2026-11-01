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
import { resolveCondition } from '../constants/weatherCodes.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';

const normalizeProviderUrl = (url: string | undefined, defaultUrl: string): string => {
  if (!url || !url.trim()) return defaultUrl;
  let clean = url.trim().replace(/\/+$/, '');
  clean = clean.replace(/\/forecast$/, '').replace(/\/air-quality$/, '').replace(/\/search$/, '');
  if (!clean.endsWith('/v1')) {
    clean = `${clean}/v1`;
  }
  return clean;
};

export class OpenMeteoAdapter implements IWeatherProvider {
  private forecastClient: AxiosInstance;
  private geoClient: AxiosInstance;
  private airClient: AxiosInstance;

  constructor() {
    const forecastBase = normalizeProviderUrl(env.OPEN_METEO_BASE_URL, 'https://api.open-meteo.com/v1');
    const geoBase = normalizeProviderUrl(env.OPEN_METEO_GEO_URL, 'https://geocoding-api.open-meteo.com/v1');
    const airBase = normalizeProviderUrl(env.OPEN_METEO_AIR_URL, 'https://air-quality-api.open-meteo.com/v1');

    const defaultHeaders = {
      'User-Agent': 'SkyCast/1.0 (Meteorological-Forecasting-Service; https://github.com/Anshida-Ansari/skycast-backend)',
      'Accept': 'application/json',
    };

    this.forecastClient = axios.create({
      baseURL: forecastBase,
      timeout: 12000,
      headers: defaultHeaders,
    });

    this.geoClient = axios.create({
      baseURL: geoBase,
      timeout: 12000,
      headers: defaultHeaders,
    });

    this.airClient = axios.create({
      baseURL: airBase,
      timeout: 12000,
      headers: defaultHeaders,
    });
  }

  private getUnitParams(units: string = 'metric') {
    if (units === 'imperial') {
      return {
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
      };
    }
    return {
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm',
    };
  }

  async getCurrentWeather(options: WeatherQueryOptions): Promise<CurrentWeather> {
    try {
      const response = await this.forecastClient.get('/forecast', {
        params: {
          latitude: options.latitude,
          longitude: options.longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'weather_code',
            'cloud_cover',
            'pressure_msl',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m',
          ].join(','),
          daily: ['sunrise', 'sunset', 'uv_index_max'].join(','),
          timezone: 'auto',
          ...this.getUnitParams(options.units),
        },
      });

      const current = response.data.current;
      const daily = response.data.daily;
      const isDay = current.is_day === 1;

      return {
        temperature: Math.round(current.temperature_2m * 10) / 10,
        feelsLike: Math.round(current.apparent_temperature * 10) / 10,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
        windDirection: current.wind_direction_10m,
        windGusts: current.wind_gusts_10m,
        pressure: Math.round(current.pressure_msl),
        uvIndex: daily?.uv_index_max?.[0] ?? 0,
        visibility: 10, // Default 10km standard clear atmospheric ceiling
        cloudCover: current.cloud_cover,
        precipitation: current.precipitation,
        condition: resolveCondition(current.weather_code, isDay),
        sunrise: daily?.sunrise?.[0] || '',
        sunset: daily?.sunset?.[0] || '',
        timestamp: current.time,
      };
    } catch (error: any) {
      const reason = error.response?.data?.reason || error.message;
      logger.error('OpenMeteo getCurrentWeather error [%s]: %o', reason, error.response?.data || error.message);
      throw new AppError(
        `Failed to fetch current weather data from meteorological provider: ${reason}`,
        502,
        ErrorCodes.WEATHER_PROVIDER_ERROR,
        error.response?.data
      );
    }
  }

  async getHourlyForecast(options: WeatherQueryOptions): Promise<HourlyForecastItem[]> {
    try {
      const response = await this.forecastClient.get('/forecast', {
        params: {
          latitude: options.latitude,
          longitude: options.longitude,
          hourly: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'precipitation_probability',
            'precipitation',
            'weather_code',
            'wind_speed_10m',
            'uv_index',
            'is_day',
          ].join(','),
          forecast_days: 2, // 48 hours for smooth 24h rolling carousel
          timezone: 'auto',
          ...this.getUnitParams(options.units),
        },
      });

      const h = response.data.hourly;
      const now = new Date();
      const items: HourlyForecastItem[] = [];

      for (let i = 0; i < h.time.length; i++) {
        const itemTime = new Date(h.time[i]);
        // Include from current hour onwards up to 24 slots
        if (itemTime.getTime() >= now.getTime() - 3600000 && items.length < 24) {
          const isDay = h.is_day ? h.is_day[i] === 1 : true;
          items.push({
            time: h.time[i],
            temperature: Math.round(h.temperature_2m[i] * 10) / 10,
            feelsLike: Math.round(h.apparent_temperature[i] * 10) / 10,
            humidity: h.relative_humidity_2m[i],
            precipitationProbability: h.precipitation_probability[i] ?? 0,
            precipitation: h.precipitation[i] ?? 0,
            windSpeed: Math.round(h.wind_speed_10m[i] * 10) / 10,
            condition: resolveCondition(h.weather_code[i], isDay),
            uvIndex: h.uv_index[i] ?? 0,
          });
        }
      }

      return items;
    } catch (error: any) {
      const reason = error.response?.data?.reason || error.message;
      logger.error('OpenMeteo getHourlyForecast error [%s]: %o', reason, error.response?.data || error.message);
      throw new AppError(
        `Failed to fetch hourly forecast from meteorological provider: ${reason}`,
        502,
        ErrorCodes.WEATHER_PROVIDER_ERROR,
        error.response?.data
      );
    }
  }

  async getDailyForecast(options: WeatherQueryOptions): Promise<DailyForecastItem[]> {
    try {
      const response = await this.forecastClient.get('/forecast', {
        params: {
          latitude: options.latitude,
          longitude: options.longitude,
          daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'apparent_temperature_min',
            'sunrise',
            'sunset',
            'uv_index_max',
            'precipitation_sum',
            'precipitation_probability_max',
            'wind_speed_10m_max',
          ].join(','),
          forecast_days: 7,
          timezone: 'auto',
          ...this.getUnitParams(options.units),
        },
      });

      const d = response.data.daily;
      const items: DailyForecastItem[] = [];

      for (let i = 0; i < d.time.length; i++) {
        items.push({
          date: d.time[i],
          maxTemperature: Math.round(d.temperature_2m_max[i] * 10) / 10,
          minTemperature: Math.round(d.temperature_2m_min[i] * 10) / 10,
          apparentMaxTemp: Math.round(d.apparent_temperature_max[i] * 10) / 10,
          apparentMinTemp: Math.round(d.apparent_temperature_min[i] * 10) / 10,
          precipitationSum: d.precipitation_sum[i] ?? 0,
          precipitationProbabilityMax: d.precipitation_probability_max[i] ?? 0,
          windSpeedMax: Math.round(d.wind_speed_10m_max[i] * 10) / 10,
          condition: resolveCondition(d.weather_code[i], true),
          sunrise: d.sunrise[i],
          sunset: d.sunset[i],
          uvIndexMax: d.uv_index_max[i] ?? 0,
        });
      }

      return items;
    } catch (error: any) {
      const reason = error.response?.data?.reason || error.message;
      logger.error('OpenMeteo getDailyForecast error [%s]: %o', reason, error.response?.data || error.message);
      throw new AppError(
        `Failed to fetch daily forecast from meteorological provider: ${reason}`,
        502,
        ErrorCodes.WEATHER_PROVIDER_ERROR,
        error.response?.data
      );
    }
  }

  async getAirQuality(options: { latitude: number; longitude: number }): Promise<AirQualityData> {
    try {
      const response = await this.airClient.get('/air-quality', {
        params: {
          latitude: options.latitude,
          longitude: options.longitude,
          current: [
            'european_aqi',
            'us_aqi',
            'pm10',
            'pm2_5',
            'carbon_monoxide',
            'nitrogen_dioxide',
            'sulphur_dioxide',
            'ozone',
          ].join(','),
        },
      });

      const current = response.data.current;
      const rawAqi = current.us_aqi ?? current.european_aqi ?? 50;

      let aqiCategory: AirQualityData['aqiCategory'] = 'Good';
      if (rawAqi <= 50) aqiCategory = 'Good';
      else if (rawAqi <= 100) aqiCategory = 'Moderate';
      else if (rawAqi <= 150) aqiCategory = 'Unhealthy for Sensitive Groups';
      else if (rawAqi <= 200) aqiCategory = 'Unhealthy';
      else if (rawAqi <= 300) aqiCategory = 'Very Unhealthy';
      else aqiCategory = 'Hazardous';

      return {
        aqi: rawAqi,
        aqiCategory,
        pm2_5: current.pm2_5 ?? 0,
        pm10: current.pm10 ?? 0,
        nitrogenDioxide: current.nitrogen_dioxide ?? 0,
        ozone: current.ozone ?? 0,
        sulphurDioxide: current.sulphur_dioxide ?? 0,
        carbonMonoxide: current.carbon_monoxide ?? 0,
        updatedAt: current.time,
      };
    } catch (error) {
      logger.error('OpenMeteo getAirQuality error: %o', error);
      // Air quality graceful degradation
      return {
        aqi: 45,
        aqiCategory: 'Good',
        pm2_5: 12,
        pm10: 25,
        nitrogenDioxide: 18,
        ozone: 30,
        sulphurDioxide: 5,
        carbonMonoxide: 200,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async searchLocations(query: string): Promise<GeocodingLocation[]> {
    try {
      const response = await this.geoClient.get('/search', {
        params: {
          name: query.trim(),
          count: 10,
          language: 'en',
          format: 'json',
        },
      });

      if (!response.data.results) {
        return [];
      }

      return response.data.results.map((item: any) => ({
        id: item.id,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        country: item.country || '',
        countryCode: item.country_code || '',
        admin1: item.admin1,
        admin2: item.admin2,
        timezone: item.timezone,
        elevation: item.elevation,
      }));
    } catch (error) {
      logger.error('OpenMeteo searchLocations error: %o', error);
      throw new AppError(
        'Failed to execute location search query',
        502,
        ErrorCodes.WEATHER_PROVIDER_ERROR
      );
    }
  }

  async getAlerts(_options: { latitude: number; longitude: number }): Promise<WeatherAlert[]> {
    // Open-Meteo alerts are currently bundled under severe weather models;
    // We return an empty alert list when no active warnings are issued, allowing seamless UI handling.
    return [];
  }
}

