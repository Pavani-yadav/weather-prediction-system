/** server/routes/forecast.js — Detailed forecast + hourly + analytics */
'use strict';
const express = require('express');
const router = express.Router();
const { fetchDetailedForecast, fetchHourly, fetchHistorical } = require('../lib/weather-engine');

async function resolveCity(cityName) {
  const { CITIES, findCityByName } = require('../lib/cities');
  const local = findCityByName(cityName);
  if (local) return local;
  try {
    const { geocode } = require('../lib/weather-engine');
    const remote = await geocode(cityName);
    if (remote) return remote;
  } catch {
    // ignore
  }
  return CITIES[0];
}

// Detailed multi-day forecast (with hourly rain timing + temp labels)
router.get('/', async (req, res) => {
  try {
    const cityName = String(req.query.city || 'San Francisco');
    const days = Math.min(16, Math.max(1, Number(req.query.days) || 7));
    const city = await resolveCity(cityName);
    const forecast = await fetchDetailedForecast(city, days);
    res.json({ city: city.name, forecast, source: 'open-meteo' });
  } catch (e) {
    res.status(500).json({ error: 'Forecast fetch failed', detail: e.message });
  }
});

// Hourly forecast (next N hours)
router.get('/hourly', async (req, res) => {
  try {
    const cityName = String(req.query.city || 'San Francisco');
    const hours = Math.min(72, Math.max(1, Number(req.query.hours) || 24));
    const city = await resolveCity(cityName);
    const hourly = await fetchHourly(city, hours);
    res.json({ city: city.name, hourly, source: 'open-meteo' });
  } catch (e) {
    res.status(500).json({ error: 'Hourly fetch failed', detail: e.message });
  }
});

// Analytics (aggregated)
router.get('/analytics', async (req, res) => {
  try {
    const cityName = String(req.query.city || 'San Francisco');
    const range = String(req.query.range || '7d');
    const city = await resolveCity(cityName);
    if (range === '24h') {
      const hourly = await fetchHourly(city, 24);
      return res.json({ type: 'hourly', range, data: hourly });
    }
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
    const hist = await fetchHistorical(city, days);
    const summary = hist.length === 0 ? {} : {
      avgTemp: +(hist.reduce((s, r) => s + r.temp, 0) / hist.length).toFixed(1),
      maxTemp: +Math.max(...hist.map((r) => r.tempHigh)).toFixed(1),
      minTemp: +Math.min(...hist.map((r) => r.tempLow)).toFixed(1),
      avgHumidity: Math.round(hist.reduce((s, r) => s + r.humidity, 0) / hist.length),
      totalPrecip: +hist.reduce((s, r) => s + r.precipitation, 0).toFixed(1),
      rainyDays: hist.filter((r) => ['Rainy', 'Stormy'].includes(r.condition)).length,
    };
    res.json({ type: 'daily', range, summary, data: hist });
  } catch (e) {
    res.status(500).json({ error: 'Analytics fetch failed', detail: e.message });
  }
});

module.exports = router;
