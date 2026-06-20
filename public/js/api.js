/* public/js/api.js — Thin fetch wrapper for the Yathin Meteora API.
 * All requests go to relative /api/* paths (served by Express on same port).
 */
'use strict';

const API = {
  token: localStorage.getItem('ym_token') || null,

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...(options.headers || {}),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    try {
      const res = await fetch(path, { ...options, headers, cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await res.text().catch(() => '');
        throw new Error(`Server returned ${ct || 'unknown'} instead of JSON`);
      }
      if (!res.ok) {
        let detail = res.statusText;
        try { const body = await res.json(); detail = body.error || body.detail || detail; } catch {}
        throw new Error(detail);
      }
      return await res.json();
    } catch (e) {
      if (e instanceof TypeError) throw new Error('Network error — backend may be offline.');
      throw e;
    }
  },

  // Auth
  login: (email, password) => API.request('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  register: (email, password, name) => API.request('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, name }),
  }),
  me: () => API.request('/api/auth/me'),

  // Weather
  getWeather: (city) => API.request(`/api/weather?city=${encodeURIComponent(city)}`),
  getRecommendations: (city) => API.request(`/api/weather/recommendations?city=${encodeURIComponent(city)}`),
  searchCities: (q) => API.request(`/api/weather/search?q=${encodeURIComponent(q)}`),
  nearestCity: (lat, lon) => API.request(`/api/weather/nearest?lat=${lat}&lon=${lon}`),

  // Forecast
  getForecast: (city, days = 7) => API.request(`/api/forecast?city=${encodeURIComponent(city)}&days=${days}`),
  getHourly: (city, hours = 24) => API.request(`/api/forecast/hourly?city=${encodeURIComponent(city)}&hours=${hours}`),
  getAnalytics: (city, range = '7d') => API.request(`/api/forecast/analytics?city=${encodeURIComponent(city)}&range=${range}`),

  // History
  getHistory: (city, days = 90) => API.request(`/api/history?city=${encodeURIComponent(city)}&days=${days}`),
  exportCsv: (rows) => API.request('/api/history/export', {
    method: 'POST', body: JSON.stringify({ rows }),
  }),

  // Alerts
  getAlerts: () => API.request('/api/alerts'),
  createAlert: (alert) => API.request('/api/alerts', {
    method: 'POST', body: JSON.stringify(alert),
  }),
  deleteAlert: (id) => API.request(`/api/alerts/${id}`, { method: 'DELETE' }),

  // ML
  predict: (features) => API.request('/api/ml/predict', {
    method: 'POST', body: JSON.stringify(features),
  }),
  getMetrics: () => API.request('/api/ml/metrics'),
  retrain: () => API.request('/api/ml/retrain', { method: 'POST' }),

  // User
  getProfile: () => API.request('/api/user/profile'),
  updateProfile: (patch) => API.request('/api/user/profile', {
    method: 'PATCH', body: JSON.stringify(patch),
  }),
  getFavorites: () => API.request('/api/user/favorites'),
  addFavorite: (city) => API.request('/api/user/favorites', {
    method: 'POST', body: JSON.stringify(city),
  }),
  removeFavorite: (id) => API.request(`/api/user/favorites/${id}`, { method: 'DELETE' }),
  getHistory2: () => API.request('/api/user/history'),
  clearHistory: () => API.request('/api/user/history', { method: 'DELETE' }),
};
