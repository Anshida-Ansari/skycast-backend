import { WeatherCondition } from '../types/weather.types.js';

interface WmoMeta {
  description: string;
  dayIcon: string;
  nightIcon: string;
}

export const WMO_CODE_MAP: Record<number, WmoMeta> = {
  0: { description: 'Clear sky', dayIcon: 'sun', nightIcon: 'moon' },
  1: { description: 'Mainly clear', dayIcon: 'sun-cloud', nightIcon: 'moon-cloud' },
  2: { description: 'Partly cloudy', dayIcon: 'cloud-sun', nightIcon: 'cloud-moon' },
  3: { description: 'Overcast', dayIcon: 'cloud', nightIcon: 'cloud' },
  45: { description: 'Foggy', dayIcon: 'cloud-fog', nightIcon: 'cloud-fog' },
  48: { description: 'Depositing rime fog', dayIcon: 'cloud-fog', nightIcon: 'cloud-fog' },
  51: { description: 'Light drizzle', dayIcon: 'cloud-drizzle', nightIcon: 'cloud-drizzle' },
  53: { description: 'Moderate drizzle', dayIcon: 'cloud-drizzle', nightIcon: 'cloud-drizzle' },
  55: { description: 'Dense drizzle', dayIcon: 'cloud-drizzle', nightIcon: 'cloud-drizzle' },
  56: { description: 'Light freezing drizzle', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  57: { description: 'Dense freezing drizzle', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  61: { description: 'Slight rain', dayIcon: 'cloud-rain', nightIcon: 'cloud-rain' },
  63: { description: 'Moderate rain', dayIcon: 'cloud-rain', nightIcon: 'cloud-rain' },
  65: { description: 'Heavy rain', dayIcon: 'cloud-rain-wind', nightIcon: 'cloud-rain-wind' },
  66: { description: 'Light freezing rain', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  67: { description: 'Heavy freezing rain', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  71: { description: 'Slight snow fall', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  73: { description: 'Moderate snow fall', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  75: { description: 'Heavy snow fall', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  77: { description: 'Snow grains', dayIcon: 'snowflake', nightIcon: 'snowflake' },
  80: { description: 'Slight rain showers', dayIcon: 'cloud-sun-rain', nightIcon: 'cloud-moon-rain' },
  81: { description: 'Moderate rain showers', dayIcon: 'cloud-rain', nightIcon: 'cloud-rain' },
  82: { description: 'Violent rain showers', dayIcon: 'cloud-rain-wind', nightIcon: 'cloud-rain-wind' },
  85: { description: 'Slight snow showers', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  86: { description: 'Heavy snow showers', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  95: { description: 'Thunderstorm', dayIcon: 'cloud-lightning', nightIcon: 'cloud-lightning' },
  96: { description: 'Thunderstorm with slight hail', dayIcon: 'cloud-lightning', nightIcon: 'cloud-lightning' },
  99: { description: 'Thunderstorm with heavy hail', dayIcon: 'cloud-lightning', nightIcon: 'cloud-lightning' },
};

export const resolveCondition = (code: number, isDay: boolean = true): WeatherCondition => {
  const meta = WMO_CODE_MAP[code] || {
    description: 'Unknown weather condition',
    dayIcon: 'cloud',
    nightIcon: 'cloud',
  };

  return {
    code,
    description: meta.description,
    icon: isDay ? meta.dayIcon : meta.nightIcon,
    isDay,
  };
};

