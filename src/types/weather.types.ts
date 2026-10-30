export type UnitSystem = 'metric' | 'imperial';

export interface WeatherCondition {
  code: number;
  description: string;
  icon: string; // Generic icon token (e.g. 'clear-day', 'partly-cloudy-day', 'rain', etc.)
  isDay: boolean;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts?: number;
  pressure: number;
  uvIndex: number;
  visibility: number; // in meters or km
  cloudCover: number; // percentage 0-100
  precipitation: number;
  condition: WeatherCondition;
  sunrise: string;
  sunset: string;
  timestamp: string;
}

export interface HourlyForecastItem {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  condition: WeatherCondition;
  uvIndex: number;
}

export interface DailyForecastItem {
  date: string;
  maxTemperature: number;
  minTemperature: number;
  apparentMaxTemp: number;
  apparentMinTemp: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  condition: WeatherCondition;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
}

export interface AirQualityData {
  aqi: number; // US EPA AQI
  aqiCategory:
    | 'Good'
    | 'Moderate'
    | 'Unhealthy for Sensitive Groups'
    | 'Unhealthy'
    | 'Very Unhealthy'
    | 'Hazardous';
  pm2_5: number;
  pm10: number;
  nitrogenDioxide: number;
  ozone: number;
  sulphurDioxide: number;
  carbonMonoxide: number;
  updatedAt: string;
}

export interface WeatherAlert {
  id: string;
  event: string;
  headline: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  effective: string;
  expires: string;
}

export interface GeocodingLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  admin1?: string; // State or province
  admin2?: string; // County or district
  timezone?: string;
  elevation?: number;
}

export interface FullWeatherResponse {
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
    city?: string;
    country?: string;
  };
  units: UnitSystem;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  airQuality?: AirQualityData;
  alerts: WeatherAlert[];
}

