 /**
 * server/lib/weather-engine.js
 * Real weather data from Open-Meteo APIs (100% free, no API key needed).
 * Includes caching to prevent 429 rate-limit loops.
 */
'use strict';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive-api';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ----------------------------- CACHE -----------------------------
const _cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function cacheSet(key, data, ttl = CACHE_TTL) {
  _cache.set(key, { data, ts: Date.now(), ttl });
}

function cacheGet(key) {
  const c = _cache.get(key);
  if (c && (Date.now() - c.ts) < (c.ttl || CACHE_TTL)) return c.data;
  if (c) _cache.delete(key);
  return null;
}

function cacheHas(key) {
  const c = _cache.get(key);
  if (c && (Date.now() - c.ts) < (c.ttl || CACHE_TTL)) return true;
  if (c) _cache.delete(key);
  return false;
}

/**
 * Cached fetch — prevents 429 loops by blocking retries for 60s on error.
 */
async function fetchJson(url, cacheKey) {
  // If we have valid cached data, return it immediately
  if (cacheHas(cacheKey)) {
    const data = cacheGet(cacheKey);
    if (data) return data;
    // Data is null = error block active. Throw without hitting the API again.
    throw new Error('Forecast API blocked (recent error)');
  }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Yathin-Meteora/1.0', 'Accept': 'application/json' }
  });

  if (!res.ok) {
    // Block this request for 60 seconds to stop 429 loops
    cacheSet(cacheKey, null, 60000);
    throw new Error(`Forecast API ${res.status}`);
  }

  const data = await res.json();
  cacheSet(cacheKey, data);
  return data;
}

// ----------------------------- Weather Code Mapping -----------------------------
function mapWeatherCode(code) {
  if (code === 0 || code === 1) return { condition: 'Sunny', description: 'Clear / mainly clear' };
  if (code === 2 || code === 3) return { condition: 'Cloudy', description: 'Partly cloudy to overcast' };
  if (code >= 45 && code <= 48) return { condition: 'Foggy', description: 'Fog' };
  if (code >= 51 && code <= 67) return { condition: 'Rainy', description: 'Rain' };
  if (code >= 71 && code <= 77) return { condition: 'Snowy', description: 'Snow' };
  if (code >= 80 && code <= 82) return { condition: 'Rainy', description: 'Rain showers' };
  if (code >= 85 && code <= 86) return { condition: 'Snowy', description: 'Snow showers' };
  if (code >= 95) return { condition: 'Stormy', description: 'Thunderstorm' };
  return { condition: 'Cloudy', description: 'Unknown' };
}

// ----------------------------- Geocode -----------------------------
async function geocode(cityName) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const d = await fetchJson(url, `geo:${cityName.toLowerCase()}`);
  const hit = d.results?.[0];
  if (!hit) return null;
  return {
    name: hit.name,
    country: hit.country_code || '',
    lat: hit.latitude,
    lon: hit.longitude,
    tz: hit.timezone,
  };
}

// ----------------------------- Current Weather -----------------------------
async function fetchCurrentWeather(city) {
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
      'precipitation', 'weather_code', 'cloud_cover', 'pressure_msl', 'surface_pressure',
      'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
    ].join(','),
    hourly: ['visibility', 'uv_index'].join(','),
    daily: ['sunrise', 'sunset', 'uv_index_max'].join(','),
    timezone: city.tz || 'auto',
    forecast_days: '1',
  });
  const url = `${FORECAST_URL}?${params}`;
  const d = await fetchJson(url, `current:${city.lat},${city.lon}`);
  const c = d.current || {};
  const daily = d.daily || {};
  const hourly = d.hourly || {};

  const nowIso = c.time;
  let visibility = 10;
  let uvIndex = 0;
  if (hourly.time && nowIso) {
    const idx = hourly.time.findIndex((t) => t.startsWith(nowIso.slice(0, 13)));
    if (idx >= 0) {
      visibility = hourly.visibility?.[idx] != null ? hourly.visibility[idx] / 1000 : visibility;
      uvIndex = hourly.uv_index?.[idx] != null ? hourly.uv_index[idx] : uvIndex;
    }
  } else if (daily.uv_index_max?.[0] != null) {
    uvIndex = daily.uv_index_max[0];
  }

  const { condition, description } = mapWeatherCode(c.weather_code ?? 0);

  let aqi = 50;
  try { aqi = await fetchAqi(city.lat, city.lon); } catch { aqi = 50; }

  return {
    city: city.name, country: city.country, lat: city.lat, lon: city.lon,
    timezone: city.tz || d.timezone || 'auto',
    temp: +(c.temperature_2m ?? 20).toFixed(1),
    feelsLike: +(c.apparent_temperature ?? c.temperature_2m ?? 20).toFixed(1),
    humidity: Math.round(c.relative_humidity_2m ?? 50),
    pressure: +(c.pressure_msl ?? c.surface_pressure ?? 1013).toFixed(1),
    windSpeed: +(c.wind_speed_10m ?? 5).toFixed(1),
    windDir: c.wind_direction_10m ?? 0,
    windGust: +(c.wind_gusts_10m ?? 0).toFixed(1),
    cloudCover: Math.round(c.cloud_cover ?? 0),
    visibility: +visibility.toFixed(1),
    uvIndex: +uvIndex.toFixed(1),
    aqi, precipitation: +(c.precipitation ?? 0).toFixed(1),
    condition, description,
    sunrise: daily.sunrise?.[0] || '', sunset: daily.sunset?.[0] || '',
    isDay: c.is_day === 1, weatherCode: c.weather_code ?? 0,
    cachedAt: new Date().toISOString(), source: 'open-meteo',
  };
}

async function fetchAqi(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    current: 'us_aqi', timezone: 'auto',
  });
  const url = `${AIR_QUALITY_URL}?${params}`;
  const d = await fetchJson(url, `aqi:${lat},${lon}`);
  return d.current?.us_aqi ?? 50;
}

// ----------------------------- Detailed Forecast -----------------------------
function tempLabelForTemp(temp) {
  if (temp >= 38) return 'Very Hot';
  if (temp >= 35) return 'Hot';
  if (temp >= 30) return 'Warm';
  if (temp >= 20) return 'Comfortable';
  if (temp >= 10) return 'Cool';
  if (temp >= 0) return 'Cold';
  return 'Freezing';
}

async function fetchDetailedForecast(city, days = 7) {
  const params = new URLSearchParams({
    latitude: String(city.lat), longitude: String(city.lon),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean',
      'relative_humidity_2m_max', 'wind_speed_10m_max', 'precipitation_sum',
      'precipitation_probability_max', 'uv_index_max', 'sunrise', 'sunset',
    ].join(','),
    hourly: ['temperature_2m', 'precipitation', 'weather_code', 'precipitation_probability'].join(','),
    timezone: city.tz || 'auto',
    forecast_days: String(Math.min(16, Math.max(1, days))),
  });
  const url = `${FORECAST_URL}?${params}`;
  const d = await fetchJson(url, `forecast:${city.lat},${city.lon}_${days}`);
  const daily = d.daily || {};
  const hourly = d.hourly || {};
  const out = [];
  const len = daily.time?.length || 0;

  for (let i = 0; i < len; i++) {
    const { condition } = mapWeatherCode(daily.weather_code?.[i] ?? 0);
    const dateStr = daily.time[i];
    const dateObj = new Date(dateStr + 'T12:00:00');
    const tempHigh = +(daily.temperature_2m_max?.[i] ?? 0).toFixed(1);
    const tempLow = +(daily.temperature_2m_min?.[i] ?? 0).toFixed(1);
    const tempMean = +(daily.temperature_2m_mean?.[i] ?? ((tempHigh + tempLow) / 2)).toFixed(1);

    let tempLabel = tempLabelForTemp(tempHigh);

    const rainHours = [];
    const heatHours = [];
    if (hourly.time) {
      for (let h = 0; h < hourly.time.length; h++) {
        if (!hourly.time[h].startsWith(dateStr)) continue;
        const hourNum = new Date(hourly.time[h]).getHours();
        const temp = hourly.temperature_2m?.[h] ?? 0;
        const precip = hourly.precipitation?.[h] ?? 0;
        const { condition: hCond } = mapWeatherCode(hourly.weather_code?.[h] ?? 0);
        heatHours.push({
          time: `${String(hourNum).padStart(2, '0')}:00`, hour: hourNum,
          temp: +temp.toFixed(1), condition: hCond, tempLabel: tempLabelForTemp(temp),
        });
        if (precip >= 0.1) {
          rainHours.push({
            time: `${String(hourNum).padStart(2, '0')}:00`, hour: hourNum,
            precipMm: +precip.toFixed(1),
            probability: hourly.precipitation_probability?.[h] ?? 0, condition: hCond,
          });
        }
      }
    }

    const peakHeat = heatHours.reduce((max, h) => h.temp > max.temp ? h : max, heatHours[0] || { temp: 0, time: '', hour: 0 });
    const coldestHour = heatHours.reduce((min, h) => h.temp < min.temp ? h : min, heatHours[0] || { temp: 0, time: '', hour: 0 });
    const hotHours = heatHours.filter((h) => h.temp >= 35);
    let heatSummary = '';
    if (hotHours.length > 0) {
      const first = hotHours[0].hour;
      const last = hotHours[hotHours.length - 1].hour;
      heatSummary = first === last
        ? `At ${String(first).padStart(2, '0')}:00`
        : `${String(first).padStart(2, '0')}:00–${String(last).padStart(2, '0')}:00`;
    }

    let rainSummary = '';
    if (rainHours.length > 0) {
      const first = rainHours[0].hour;
      const last = rainHours[rainHours.length - 1].hour;
      rainSummary = first === last
        ? `At ${String(first).padStart(2, '0')}:00`
        : `${String(first).padStart(2, '0')}:00–${String(last).padStart(2, '0')}:00`;
    }

    out.push({
      date: dateStr, weekday: WEEKDAYS[dateObj.getDay()],
      condition, tempHigh, tempLow, tempMean, tempLabel,
      humidity: Math.round(daily.relative_humidity_2m_max?.[i] ?? 0),
      windSpeed: +(daily.wind_speed_10m_max?.[i] ?? 0).toFixed(1),
      precipitation: +(daily.precipitation_sum?.[i] ?? 0).toFixed(1),
      precipitationProbability: Math.round(daily.precipitation_probability_max?.[i] ?? 0),
      uvIndex: +(daily.uv_index_max?.[i] ?? 0).toFixed(1),
      sunrise: daily.sunrise?.[i] || '', sunset: daily.sunset?.[i] || '',
      rainHours, rainSummary,
      heatHours, peakHeat, coldestHour, hotHours, heatSummary,
      feelsLikeHigh: +(tempHigh + 2).toFixed(1),
    });
  }
  return out;
}

// ----------------------------- Hourly -----------------------------
async function fetchHourly(city, hours = 24) {
  const params = new URLSearchParams({
    latitude: String(city.lat), longitude: String(city.lon),
    hourly: ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'precipitation', 'weather_code', 'precipitation_probability'].join(','),
    timezone: city.tz || 'auto',
    forecast_days: String(Math.max(1, Math.ceil(hours / 24))),
  });
  const url = `${FORECAST_URL}?${params}`;
  const d = await fetchJson(url, `hourly:${city.lat},${city.lon}_${hours}`);
  const hourly = d.hourly || {};
  const out = [];
  const now = Date.now();
  let counted = 0;
  const len = Math.min(hours, hourly.time?.length || 0);
  for (let i = 0; i < (hourly.time?.length || 0) && counted < len; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t < now - 3600 * 1000) continue;
    const { condition } = mapWeatherCode(hourly.weather_code?.[i] ?? 0);
    out.push({
      time: hourly.time[i], hour: new Date(hourly.time[i]).getHours(),
      temp: +(hourly.temperature_2m?.[i] ?? 0).toFixed(1),
      humidity: Math.round(hourly.relative_humidity_2m?.[i] ?? 0),
      windSpeed: +(hourly.wind_speed_10m?.[i] ?? 0).toFixed(1),
      precipitation: +(hourly.precipitation?.[i] ?? 0).toFixed(1),
      precipitationProbability: hourly.precipitation_probability?.[i] ?? 0,
      condition,
    });
    counted++;
  }
  return out;
}

// ----------------------------- Historical -----------------------------
async function fetchHistorical(city, days = 90) {
  if (days <= 92) {
    const params = new URLSearchParams({
      latitude: String(city.lat), longitude: String(city.lon),
      daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean', 'relative_humidity_2m_max', 'wind_speed_10m_max', 'precipitation_sum'].join(','),
      timezone: city.tz || 'auto', past_days: String(days), forecast_days: '1',
    });
    const url = `${FORECAST_URL}?${params}`;
    const d = await fetchJson(url, `hist:${city.lat},${city.lon}_${days}`);
    const daily = d.daily || {};
    const out = [];
    const len = daily.time?.length || 0;
    for (let i = 0; i < len; i++) {
      const { condition } = mapWeatherCode(daily.weather_code?.[i] ?? 0);
      const tempMean = daily.temperature_2m_mean?.[i] ?? ((daily.temperature_2m_max?.[i] ?? 0) + (daily.temperature_2m_min?.[i] ?? 0)) / 2;
      out.push({
        date: daily.time[i], city: city.name, country: city.country, condition,
        temp: +(tempMean ?? 0).toFixed(1),
        tempHigh: +(daily.temperature_2m_max?.[i] ?? 0).toFixed(1),
        tempLow: +(daily.temperature_2m_min?.[i] ?? 0).toFixed(1),
        humidity: Math.round(daily.relative_humidity_2m_max?.[i] ?? 0),
        windSpeed: +(daily.wind_speed_10m_max?.[i] ?? 0).toFixed(1),
        precipitation: +(daily.precipitation_sum?.[i] ?? 0).toFixed(1),
      });
    }
    return out;
  }

  const end = new Date(); end.setDate(end.getDate() - 5);
  const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
  const params = new URLSearchParams({
    latitude: String(city.lat), longitude: String(city.lon),
    start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10),
    daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean', 'relative_humidity_2m_max', 'wind_speed_10m_max', 'precipitation_sum', 'pressure_msl'].join(','),
    timezone: city.tz || 'auto',
  });
  const url = `${ARCHIVE_URL}?${params}`;
  const d = await fetchJson(url, `archive:${city.lat},${city.lon}_${days}`);
  const daily = d.daily || {};
  const out = [];
  const len = daily.time?.length || 0;
  for (let i = 0; i < len; i++) {
    const { condition } = mapWeatherCode(daily.weather_code?.[i] ?? 0);
    const tempMean = daily.temperature_2m_mean?.[i] ?? ((daily.temperature_2m_max?.[i] ?? 0) + (daily.temperature_2m_min?.[i] ?? 0)) / 2;
    out.push({
      date: daily.time[i], city: city.name, country: city.country, condition,
      temp: +(tempMean ?? 0).toFixed(1),
      tempHigh: +(daily.temperature_2m_max?.[i] ?? 0).toFixed(1),
      tempLow: +(daily.temperature_2m_min?.[i] ?? 0).toFixed(1),
      humidity: Math.round(daily.relative_humidity_2m_max?.[i] ?? 0),
      windSpeed: +(daily.wind_speed_10m_max?.[i] ?? 0).toFixed(1),
      pressure: +(daily.pressure_msl?.[i] ?? 1013).toFixed(1),
      precipitation: +(daily.precipitation_sum?.[i] ?? 0).toFixed(1),
    });
  }
  return out;
}

module.exports = {
  WEEKDAYS, mapWeatherCode, geocode,
  fetchCurrentWeather, fetchAqi, fetchDetailedForecast, fetchHourly, fetchHistorical,
};