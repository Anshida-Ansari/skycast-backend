import { WeatherCondition } from '../types/weather.types.js';

interface WeatherApiMeta {
  description: string;
  dayIcon: string;
  nightIcon: string;
}

const WEATHERAPI_CODE_MAP: Record<number, WeatherApiMeta> = {
  1000: { description: 'Clear sky', dayIcon: 'sun', nightIcon: 'moon' },
  1003: { description: 'Partly cloudy', dayIcon: 'cloud-sun', nightIcon: 'cloud-moon' },
  1006: { description: 'Cloudy', dayIcon: 'cloud', nightIcon: 'cloud' },
  1009: { description: 'Overcast', dayIcon: 'cloud', nightIcon: 'cloud' },
  1030: { description: 'Mist', dayIcon: 'cloud-fog', nightIcon: 'cloud-fog' },
  1063: { description: 'Patchy rain possible', dayIcon: 'cloud-drizzle', nightIcon: 'cloud-drizzle' },
  1066: { description: 'Patchy snow possible', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1069: { description: 'Patchy sleet possible', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1072: { description: 'Patchy freezing drizzle', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1087: { description: 'Thundery outbreaks possible', dayIcon: 'cloud-lightning', nightIcon: 'cloud-lightning' },
  1114: { description: 'Blowing snow', dayIcon: 'snowflake', nightIcon: 'snowflake' },
  1117: { description: 'Blizzard', dayIcon: 'snowflake', nightIcon: 'snowflake' },
  1135: { description: 'Fog', dayIcon: 'cloud-fog', nightIcon: 'cloud-fog' },
  1147: { description: 'Freezing fog', dayIcon: 'cloud-fog', nightIcon: 'cloud-fog' },
  1150: { description: 'Patchy light drizzle', dayIcon: 'cloud-drizzle', nightIcon: 'cloud-drizzle' },
  1153: { description: 'Light drizzle', dayIcon: 'cloud-drizzle', nightIcon: 'cloud-drizzle' },
  1168: { description: 'Freezing drizzle', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1171: { description: 'Heavy freezing drizzle', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1180: { description: 'Patchy light rain', dayIcon: 'cloud-rain', nightIcon: 'cloud-rain' },
  1183: { description: 'Light rain', dayIcon: 'cloud-rain', nightIcon: 'cloud-rain' },
  1186: { description: 'Moderate rain at times', dayIcon: 'cloud-rain', nightIcon: 'cloud-rain' },
  1189: { description: 'Moderate rain', dayIcon: 'cloud-rain', nightIcon: 'cloud-rain' },
  1192: { description: 'Heavy rain at times', dayIcon: 'cloud-rain-wind', nightIcon: 'cloud-rain-wind' },
  1195: { description: 'Heavy rain', dayIcon: 'cloud-rain-wind', nightIcon: 'cloud-rain-wind' },
  1198: { description: 'Light freezing rain', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1201: { description: 'Moderate or heavy freezing rain', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1204: { description: 'Light sleet', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1207: { description: 'Moderate or heavy sleet', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1210: { description: 'Patchy light snow', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1213: { description: 'Light snow', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1216: { description: 'Patchy moderate snow', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1219: { description: 'Moderate snow', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1222: { description: 'Patchy heavy snow', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1225: { description: 'Heavy snow', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1237: { description: 'Ice pellets', dayIcon: 'snowflake', nightIcon: 'snowflake' },
  1240: { description: 'Light rain shower', dayIcon: 'cloud-sun-rain', nightIcon: 'cloud-moon-rain' },
  1243: { description: 'Moderate or heavy rain shower', dayIcon: 'cloud-rain-wind', nightIcon: 'cloud-rain-wind' },
  1246: { description: 'Torrential rain shower', dayIcon: 'cloud-rain-wind', nightIcon: 'cloud-rain-wind' },
  1249: { description: 'Light sleet showers', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1252: { description: 'Moderate or heavy sleet showers', dayIcon: 'cloud-hail', nightIcon: 'cloud-hail' },
  1255: { description: 'Light snow showers', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1258: { description: 'Moderate or heavy snow showers', dayIcon: 'cloud-snow', nightIcon: 'cloud-snow' },
  1261: { description: 'Light showers of ice pellets', dayIcon: 'snowflake', nightIcon: 'snowflake' },
  1264: { description: 'Moderate or heavy showers of ice pellets', dayIcon: 'snowflake', nightIcon: 'snowflake' },
  1273: { description: 'Patchy light rain with thunder', dayIcon: 'cloud-lightning', nightIcon: 'cloud-lightning' },
  1276: { description: 'Moderate or heavy rain with thunder', dayIcon: 'cloud-lightning', nightIcon: 'cloud-lightning' },
  1279: { description: 'Patchy light snow with thunder', dayIcon: 'cloud-lightning', nightIcon: 'cloud-lightning' },
  1282: { description: 'Moderate or heavy snow with thunder', dayIcon: 'cloud-lightning', nightIcon: 'cloud-lightning' },
};

export const resolveWeatherApiCondition = (
  code: number,
  fallbackText: string = 'Clear',
  isDay: boolean = true
): WeatherCondition => {
  const meta = WEATHERAPI_CODE_MAP[code];
  if (meta) {
    return {
      code,
      description: meta.description,
      icon: isDay ? meta.dayIcon : meta.nightIcon,
      isDay,
    };
  }

  // Fallback to text matching if unknown code
  const lower = fallbackText.toLowerCase();
  let dayIcon = 'sun';
  let nightIcon = 'moon';

  if (lower.includes('rain') || lower.includes('drizzle')) {
    dayIcon = 'cloud-rain';
    nightIcon = 'cloud-rain';
  } else if (lower.includes('thunder')) {
    dayIcon = 'cloud-lightning';
    nightIcon = 'cloud-lightning';
  } else if (lower.includes('snow') || lower.includes('ice') || lower.includes('blizzard')) {
    dayIcon = 'cloud-snow';
    nightIcon = 'cloud-snow';
  } else if (lower.includes('cloud') || lower.includes('overcast')) {
    dayIcon = 'cloud';
    nightIcon = 'cloud';
  } else if (lower.includes('fog') || lower.includes('mist')) {
    dayIcon = 'cloud-fog';
    nightIcon = 'cloud-fog';
  }

  return {
    code,
    description: fallbackText,
    icon: isDay ? dayIcon : nightIcon,
    isDay,
  };
};

