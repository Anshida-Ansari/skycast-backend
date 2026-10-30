import {
  AirQualityData,
  CurrentWeather,
  DailyForecastItem,
  GeocodingLocation,
  HourlyForecastItem,
  UnitSystem,
  WeatherAlert,
} from '../types/weather.types.js';

export interface WeatherQueryOptions {
  latitude: number;
  longitude: number;
  units?: UnitSystem;
}

export interface IWeatherProvider {
  getCurrentWeather(options: WeatherQueryOptions): Promise<CurrentWeather>;
  getHourlyForecast(options: WeatherQueryOptions): Promise<HourlyForecastItem[]>;
  getDailyForecast(options: WeatherQueryOptions): Promise<DailyForecastItem[]>;
  getAirQuality(options: { latitude: number; longitude: number }): Promise<AirQualityData>;
  searchLocations(query: string): Promise<GeocodingLocation[]>;
  getAlerts(options: { latitude: number; longitude: number }): Promise<WeatherAlert[]>;
}

