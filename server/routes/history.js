/** server/routes/history.js — Historical weather data (CSV export) */
'use strict';
const express = require('express');
const router = express.Router();
const { fetchHistorical } = require('../lib/weather-engine');

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

router.get('/', async (req, res) => {
  try {
    const cityName = String(req.query.city || 'San Francisco');
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 90));
    const city = await resolveCity(cityName);
    let rows = await fetchHistorical(city, days);
    if (req.query.from && req.query.to) {
      rows = rows.filter((r) => r.date >= req.query.from && r.date <= req.query.to);
    }
    if (req.query.condition) {
      rows = rows.filter((r) => r.condition === req.query.condition);
    }
    res.json({ city: city.name, rows, source: 'open-meteo' });
  } catch (e) {
    res.status(500).json({ error: 'History fetch failed', detail: e.message });
  }
});

// CSV export
router.post('/export', (req, res) => {
  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array required' });
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => {
        const v = r[h];
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="weatherai-history.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: 'CSV export failed', detail: e.message });
  }
});

module.exports = router;
