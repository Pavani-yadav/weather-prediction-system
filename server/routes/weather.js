/** server/routes/weather.js — Current weather + recommendations + geocoding */
'use strict';
const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const { authOptional } = require('../lib/auth');
const { fetchCurrentWeather, geocode, fetchAqi } = require('../lib/weather-engine');
const { generateRecommendations } = require('../lib/recommendations');

async function resolveCity(cityName) {
  // Try local list first
  const { CITIES, findCityByName } = require('../lib/cities');
  const local = findCityByName(cityName);
  if (local) return local;
  // Fall back to Open-Meteo geocoding (any village/town worldwide)
  try {
    const remote = await geocode(cityName);
    if (remote) return remote;
  } catch {
    // ignore
  }
  return CITIES[0];
}
// Current weather — REAL data from Open-Meteo
router.get('/', async (req, res) => {
  try {
    const cityName = String(req.query.city || 'San Francisco');
    const city = await resolveCity(cityName);
    const weather = await fetchCurrentWeather(city);

    // Save snapshot (non-fatal)
    try {
      const db = getDb();
      await db.weathersnapshots.create({
        city: city.name,
        country: city.country,
        temp: weather.temp,
        humidity: weather.humidity,
        pressure: weather.pressure,
        windSpeed: weather.windSpeed,
        visibility: weather.visibility,
        uvIndex: weather.uvIndex,
        aqi: weather.aqi,
        cloudCover: weather.cloudCover || 0,
        condition: weather.condition,
        recordedAt: new Date(),
      });

      await db.searchhistory.create({
        userId: 'admin-user',
        city: city.name,
        country: city.country,
        condition: weather.condition,
        temp: weather.temp,
      });
    } catch {
      // non-fatal
    }

    res.json({ weather });

  } catch (e) {
    console.error('Weather API Error:', e.message);

    // Fallback data if weather API fails
    res.json({
      weather: {
        city: String(req.query.city || 'Hyderabad'),
        temp: 29,
        humidity: 65,
        pressure: 1012,
        windSpeed: 12,
        visibility: 10,
        uvIndex: 6,
        aqi: 45,
        cloudCover: 30,
        condition: 'Partly Cloudy',
        source: 'fallback'
      }
    });
  }
});

// AI recommendations based on current weather
router.get('/recommendations', async (req, res) => {
  try {
    const cityName = String(req.query.city || 'San Francisco');
    const city = await resolveCity(cityName);
    const weather = await fetchCurrentWeather(city);
    res.json({ recommendations: generateRecommendations(weather) });
  } catch (e) {
    res.status(500).json({ error: 'Recommendations failed', detail: e.message });
  }
});

// Search cities (local + Open-Meteo geocoding merge)
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { searchCities } = require('../lib/cities');
  if (q.length < 2) {
    return res.json({ cities: searchCities(q, 12), source: 'local' });
  }
  try {
    const remote = await geocode(q);
    const local = searchCities(q, 8);
    const seen = new Set(local.map((c) => c.name.toLowerCase()));
    const merged = remote && !seen.has(remote.name.toLowerCase())
      ? [remote, ...local]
      : local;
    res.json({ cities: merged.slice(0, 15), source: 'merged' });
  } catch {
    res.json({ cities: searchCities(q, 12), source: 'local' });
  }
});

// Nearest city by lat/lon (for geolocation)
router.get('/nearest', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });
  const { nearestCity } = require('../lib/cities');
  res.json({ city: nearestCity(lat, lon) });
});

module.exports = router;
