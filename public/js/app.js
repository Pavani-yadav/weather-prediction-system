/* public/js/app.js — Yathin Meteora main app logic (vanilla JS, no frameworks).
 * Handles: navigation, city search, theme, clock, all 7 views, live updates.
 */
'use strict';

// === Global state ===
const state = {
  view: 'dashboard',
  selectedCity: { name: 'Hyderabad', country: 'IN', lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' },
  weather: null,
  forecast: [],
  hourly: [],
  metrics: null,
  theme: localStorage.getItem('ym_theme') || 'light',
};

// === Weather condition helpers ===
const CONDITION_ICONS = {
  Sunny: '☀️', Cloudy: '☁️', Rainy: '🌧️', Stormy: '⛈️', Foggy: '🌫️', Snowy: '🌨️',
};
const CONDITION_COLORS = {
  Sunny: 'var(--condition-sunny)', Cloudy: 'var(--condition-cloudy)',
  Rainy: 'var(--condition-rainy)', Stormy: 'var(--condition-stormy)',
  Foggy: 'var(--condition-foggy)', Snowy: 'var(--condition-snowy)',
};

function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return '--:--'; }
}

function tempLabel(temp) {
  if (temp >= 38) return 'Very Hot';
  if (temp >= 35) return 'Heat';
  if (temp >= 30) return 'Warm';
  if (temp >= 20) return 'Comfortable';
  if (temp >= 10) return 'Cool';
  if (temp >= 0) return 'Cold';
  return 'Freezing';
}
function tempBadgeClass(temp) {
  if (temp >= 35) return 'hot';
  if (temp >= 30) return 'warm';
  if (temp >= 20) return 'comfortable';
  if (temp >= 10) return 'cool';
  return 'cold';
}
function tempBadgeIcon(temp) {
  if (temp >= 35) return '🔥';
  if (temp >= 30) return '☀️';
  if (temp >= 20) return '⛅';
  if (temp >= 10) return '☁️';
  return '❄️';
}

function uvLabel(uv) {
  if (uv < 3) return { label: 'Low', color: '#10b981' };
  if (uv < 6) return { label: 'Moderate', color: '#f59e0b' };
  if (uv < 8) return { label: 'High', color: '#f97316' };
  if (uv < 11) return { label: 'Very High', color: '#ef4444' };
  return { label: 'Extreme', color: '#8b5cf6' };
}

function aqiLabel(aqi) {
  if (aqi < 50) return { label: 'Good', color: '#10b981' };
  if (aqi < 100) return { label: 'Moderate', color: '#eab308' };
  if (aqi < 150) return { label: 'Unhealthy (Sensitive)', color: '#f97316' };
  if (aqi < 200) return { label: 'Unhealthy', color: '#ef4444' };
  if (aqi < 300) return { label: 'Very Unhealthy', color: '#8b5cf6' };
  return { label: 'Hazardous', color: '#7f1d1d' };
}

// === Toast ===
function toast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(120%)'; setTimeout(() => el.remove(), 300); }, 3000);
}

// === Clock ===
function updateClock() {
  const now = new Date();
  document.getElementById('clockTime').textContent = now.toLocaleTimeString();
  document.getElementById('clockDate').textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
setInterval(updateClock, 1000); updateClock();

// === Theme ===
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('ym_theme', theme);
}
document.getElementById('themeBtn').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  // Re-render current view to update chart colors
  renderView();
});
applyTheme(state.theme);

// === Navigation ===
document.querySelectorAll('.nav-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.view = btn.dataset.view;
    renderView();
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  });
});

// === Mobile menu ===
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// === City search ===
const searchInput = document.getElementById('citySearch');
const searchDropdown = document.getElementById('searchDropdown');
let searchTimer = null;

searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  clearTimeout(searchTimer);
  if (q.length < 2) {
    searchDropdown.classList.remove('show');
    return;
  }
  searchTimer = setTimeout(async () => {
    try {
      const data = await API.searchCities(q);
      searchDropdown.innerHTML = data.cities.map((c, i) => `
        <div class="search-item ${i === 0 ? 'active' : ''}" data-city="${encodeURIComponent(c.name)}" data-country="${c.country}" data-lat="${c.lat}" data-lon="${c.lon}" data-tz="${c.tz || ''}">
          <span class="search-item-name">${c.name}</span>
          <span class="search-item-country">${c.country}</span>
        </div>
      `).join('');
      searchDropdown.classList.add('show');
      searchDropdown.querySelectorAll('.search-item').forEach((item) => {
        item.addEventListener('click', () => {
          state.selectedCity = {
            name: decodeURIComponent(item.dataset.city),
            country: item.dataset.country,
            lat: parseFloat(item.dataset.lat),
            lon: parseFloat(item.dataset.lon),
            tz: item.dataset.tz || undefined,
          };
          searchInput.value = '';
          searchDropdown.classList.remove('show');
          fetchWeather();
          renderView();
          toast(`Switched to ${state.selectedCity.name}`, 'success');
        });
      });
    } catch (e) {
      // silent
    }
  }, 250);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) searchDropdown.classList.remove('show');
});

// === Voice search ===
document.getElementById('voiceBtn').addEventListener('click', () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Voice search not supported in this browser', 'error'); return; }
  const rec = new SR();
  rec.lang = 'en-US'; rec.interimResults = false;
  toast('Listening... speak a city name', 'info');
  rec.onresult = (e) => {
    const transcript = e.results[0][0].transcript.trim();
    searchInput.value = transcript;
    searchInput.dispatchEvent(new Event('input'));
  };
  rec.onerror = () => toast('Voice search error', 'error');
  rec.start();
});

// === Geolocation ===
document.getElementById('locationBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { toast('Geolocation not supported', 'error'); return; }
  toast('Detecting your location...', 'info');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const data = await API.nearestCity(pos.coords.latitude, pos.coords.longitude);
      if (data.city) {
        state.selectedCity = data.city;
        fetchWeather();
        renderView();
        toast(`Detected: ${data.city.name} (${data.city.distanceKm.toFixed(0)} km away)`, 'success');
      }
    } catch (e) { toast('Could not detect location', 'error'); }
  }, (err) => toast('Location access denied', 'error'), { timeout: 8000 });
});

// === TTS ===
document.getElementById('ttsBtn').addEventListener('click', () => {
  if (!state.weather) { toast('No weather data to read', 'error'); return; }
  if (!window.speechSynthesis) { toast('TTS not supported', 'error'); return; }
  const w = state.weather;
  const text = `Currently in ${w.city}, ${w.temp} degrees Celsius, ${w.condition}. Humidity ${w.humidity} percent. Wind ${w.windSpeed} kilometers per hour.`;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
  toast('Reading weather aloud', 'success');
});

// === Profile button → go to Settings view ===
document.getElementById('profileBtn').addEventListener('click', () => {
  document.querySelectorAll('.nav-pill').forEach((b) => b.classList.remove('active'));
  document.querySelector('.nav-pill[data-view="settings"]').classList.add('active');
  state.view = 'settings';
  renderView();
});

// === Fetch weather ===
async function fetchWeather() {
  try {
    const data = await API.getWeather(state.selectedCity.name);
    state.weather = data.weather;
    document.getElementById('liveBadge').style.display = 'inline-flex';
  } catch (e) {
    toast(e.message, 'error');
  }
}

// === View rendering ===
function renderView() {
  const content = document.getElementById('content');
  switch (state.view) {
    case 'dashboard': renderDashboard(content); break;
    case 'prediction': renderPrediction(content); break;
    case 'forecast': renderForecast(content); break;
    case 'historical': renderHistorical(content); break;
    case 'alerts': renderAlerts(content); break;
    case 'reports': renderReports(content); break;
    case 'settings': renderSettings(content); break;
    default: renderDashboard(content);
  }
}

// === Dashboard view ===
async function renderDashboard(container) {
  container.innerHTML = `<div class="view"><div class="loading">Loading real weather data...</div></div>`;
  if (!state.weather) await fetchWeather();
  if (!state.weather) {
    container.innerHTML = `<div class="view"><div class="empty-state">Could not load weather. Make sure the backend is running on port 3000.</div></div>`;
    return;
  }

  const w = state.weather;
  const clr = CONDITION_COLORS[w.condition] || CONDITION_COLORS.Sunny;

  // Fetch forecast + hourly + recommendations in parallel
  const [forecastData, hourlyData, recsData] = await Promise.all([
    API.getForecast(state.selectedCity.name, 7).catch(() => ({ forecast: [] })),
    API.getHourly(state.selectedCity.name, 24).catch(() => ({ hourly: [] })),
    API.getRecommendations(state.selectedCity.name).catch(() => ({ recommendations: [] })),
  ]);
  state.forecast = forecastData.forecast || [];
  state.hourly = hourlyData.hourly || [];
  const recs = recsData.recommendations || [];

  // Today's forecast
  const todayForecast = state.forecast[0];

  // Hourly data for chart — show EVERY hour (all 24)
  const hourlyChart = state.hourly.map((h) => {
    const hour12 = h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour;
    const ampm = h.hour < 12 ? 'am' : 'pm';
    return { label: `${hour12} ${ampm}`, value: h.temp, precip: h.precipitation, wind: h.windSpeed, humidity: h.humidity, hour: h.hour };
  });

  // Find peak heat hour today
  const peakHeatHour = state.hourly.reduce((max, h) => h.temp > max.temp ? h : max, state.hourly[0] || { temp: 0, hour: 0 });
  const peakHeatLabel = peakHeatHour ? `${peakHeatHour.hour === 0 ? 12 : peakHeatHour.hour > 12 ? peakHeatHour.hour - 12 : peakHeatHour.hour} ${peakHeatHour.hour < 12 ? 'am' : 'pm'}` : '';

  container.innerHTML = `
    <div class="view">
      <!-- HERO — Google Weather style -->
      <div class="card hero">
        <div class="hero-left">
          <div class="weather-icon-large">${CONDITION_ICONS[w.condition] || '☀️'}</div>
          <div class="hero-temp">${w.temp.toFixed(0)}</div>
          <div class="hero-unit"><span class="active">°C</span><span>°F</span></div>
          <div class="hero-sub-info">
            <div>Precipitation: <strong>${w.precipitation ?? 0}%</strong></div>
            <div>Humidity: <strong>${w.humidity}%</strong></div>
            <div>Wind: <strong>${w.windSpeed.toFixed(0)} km/h</strong></div>
          </div>
        </div>
        <div class="hero-right">
          <h2>Weather</h2>
          <div class="condition" style="color: ${clr}">${w.condition}</div>
          <div class="location">📍 ${w.city}, ${w.country}</div>
          <div class="location">${new Date().toLocaleDateString(undefined, { weekday: 'long' })}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="feels">Feels like ${w.feelsLike.toFixed(0)}°C</div>
          <div class="temp-badge ${tempBadgeClass(w.temp)}">${tempBadgeIcon(w.temp)} ${tempLabel(w.temp)}</div>
        </div>
      </div>

      <!-- HOURLY TEMPERATURE CHART — every hour, Google Weather style -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="card-title" style="margin-bottom: 0;">🌡️ Temperature · Next 24 Hours · Every Hour</div>
          <div style="display: flex; gap: 4px;" id="hourlyTabs">
            <button class="tab active" data-tab="temp" style="font-size: 11px; padding: 4px 10px;">Temperature</button>
            <button class="tab" data-tab="precip" style="font-size: 11px; padding: 4px 10px;">Precipitation</button>
            <button class="tab" data-tab="wind" style="font-size: 11px; padding: 4px 10px;">Wind</button>
          </div>
        </div>
        <div class="chart-container" style="height: 240px;"><canvas id="hourlyChart"></canvas></div>

        <!-- Time-based weather summary -->
        <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
          ${peakHeatHour && peakHeatHour.temp >= 35 ? `
          <div style="padding: 10px; border-radius: 10px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3);">
            <div style="font-size: 10px; color: #ef4444; text-transform: uppercase; letter-spacing: 0.1em;">🔥 Peak Heat</div>
            <div style="font-size: 18px; font-weight: 700; color: #ef4444;">${peakHeatHour.temp.toFixed(0)}°C at ${peakHeatLabel}</div>
          </div>` : ''}
          ${todayForecast?.rainSummary ? `
          <div style="padding: 10px; border-radius: 10px; background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.3);">
            <div style="font-size: 10px; color: var(--chart-1); text-transform: uppercase; letter-spacing: 0.1em;">🌧️ Rain Window</div>
            <div style="font-size: 14px; font-weight: 600; color: var(--chart-1);">${todayForecast.rainSummary}</div>
            <div style="font-size: 11px; color: var(--muted);">${todayForecast.precipitation.toFixed(1)}mm · ${todayForecast.precipitationProbability}% probability</div>
          </div>` : ''}
          <div style="padding: 10px; border-radius: 10px; background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em;">🌅 Sunrise</div>
            <div style="font-size: 14px; font-weight: 600;">${fmtTime(w.sunrise)}</div>
          </div>
          <div style="padding: 10px; border-radius: 10px; background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em;">🌇 Sunset</div>
            <div style="font-size: 14px; font-weight: 600;">${fmtTime(w.sunset)}</div>
          </div>
        </div>
      </div>

      <!-- 7-DAY FORECAST — clickable cards -->
      <div class="card">
        <div class="card-title">📅 7-Day Forecast · Real data · ${w.city} <span style="font-size: 10px; color: var(--muted); font-weight: normal;">(click a day for details)</span></div>
        <div class="forecast-week">
          ${state.forecast.slice(0, 7).map((d, i) => {
            const isToday = i === 0;
            const dClr = CONDITION_COLORS[d.condition] || CONDITION_COLORS.Sunny;
            return `
              <div class="forecast-day ${isToday ? 'today' : ''}" data-day-index="${i}" style="cursor: pointer;">
                <div class="day-name">${d.weekday}</div>
                <div class="day-date">${d.date.slice(8)}/${d.date.slice(5,7)}</div>
                <div class="day-icon">${CONDITION_ICONS[d.condition] || '☀️'}</div>
                <div class="day-cond" style="color: ${dClr}">${d.condition}</div>
                <div class="day-temps">
                  <span class="day-high" style="color: ${dClr}">${d.tempHigh.toFixed(0)}°</span>
                  <span class="day-low">${d.tempLow.toFixed(0)}°</span>
                </div>
                ${d.precipitation >= 0.1 ? `<div class="day-precip">💧 ${d.precipitation.toFixed(1)}mm</div>` : '<div class="day-precip" style="opacity: 0.4">—</div>'}
                ${d.rainSummary ? `<div style="font-size: 9px; color: var(--chart-1); margin-top: 2px;">🕐 ${d.rainSummary}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div id="dayDetail" style="margin-top: 16px; display: none;"></div>
      </div>

      <!-- Detailed metrics -->
      <div class="card">
        <div class="card-title">Detailed Metrics · ${w.city}</div>
        <div class="metrics-grid">
          ${renderMetricCard('🌡️', 'Temperature', w.temp.toFixed(1), '°C', `Feels like ${w.feelsLike.toFixed(0)}°`, '#ef4444')}
          ${renderMetricCard('💧', 'Humidity', w.humidity, '%', '', '#06b6d4')}
          ${renderMetricCard('📊', 'Pressure', w.pressure.toFixed(0), 'hPa', '', '#8b5cf6')}
          ${renderMetricCard('💨', 'Wind', w.windSpeed.toFixed(1), 'km/h', `Dir ${w.windDir}°`, '#10b981')}
          ${renderMetricCard('👁️', 'Visibility', w.visibility.toFixed(1), 'km', '', '#3b82f6')}
          ${renderMetricCard('☀️', 'UV Index', w.uvIndex.toFixed(1), '', uvLabel(w.uvIndex).label, '#f59e0b')}
          ${renderMetricCard('🌫️', 'Air Quality', w.aqi, '', aqiLabel(w.aqi).label, '#f97316')}
          ${renderMetricCard('🌅', 'Sunrise', fmtTime(w.sunrise), '', `Sunset ${fmtTime(w.sunset)}`, '#ec4899')}
        </div>
      </div>

      <!-- AI Recommendations -->
      <div class="card">
        <div class="card-title">AI Recommendations</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
          ${recs.slice(0, 6).map((r) => `
            <div style="padding: 12px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); display: flex; gap: 10px;">
              <div style="font-size: 20px;">${r.icon === 'umbrella' ? '☂️' : r.icon === 'sun' ? '☀️' : r.icon === 'wind' ? '💨' : r.icon === 'air' ? '🌫️' : r.icon === 'thermometer' ? '🌡️' : r.icon === 'eye' ? '👁️' : r.icon === 'smile' ? '😊' : r.icon === 'gauge' ? '📊' : r.icon === 'droplet' ? '💧' : '✓'}</div>
              <div>
                <div style="font-size: 13px; font-weight: 500;">${r.title}</div>
                <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">${r.message}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Render hourly chart (default: temp) — show ALL 24 hours
  renderHourlyChart('temp');

  // Wire tab clicks
  document.querySelectorAll('#hourlyTabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#hourlyTabs .tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderHourlyChart(tab.dataset.tab);
    });
  });

  // Wire forecast day clicks — show detailed view for that day
  document.querySelectorAll('.forecast-day[data-day-index]').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.dayIndex);
      const d = state.forecast[idx];
      if (!d) return;
      const detail = document.getElementById('dayDetail');
      const dClr = CONDITION_COLORS[d.condition] || CONDITION_COLORS.Sunny;
      // Highlight selected card
      document.querySelectorAll('.forecast-day').forEach((c) => c.style.borderColor = '');
      card.style.borderColor = 'var(--accent)';
      detail.style.display = 'block';
      detail.innerHTML = `
        <div style="padding: 16px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); animation: fadeInUp 300ms ease;">
          <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div style="font-size: 48px;">${CONDITION_ICONS[d.condition] || '☀️'}</div>
            <div>
              <div style="font-size: 20px; font-weight: 700;">${d.weekday}, ${d.date}</div>
              <div style="font-size: 14px; color: ${dClr}; font-weight: 500;">${d.condition} · ${d.tempLabel}</div>
            </div>
            <div style="margin-left: auto; display: flex; gap: 16px; flex-wrap: wrap;">
              <div style="text-align: center;"><div style="font-size: 10px; color: var(--muted); text-transform: uppercase;">High</div><div style="font-size: 24px; font-weight: 700; color: ${dClr};">${d.tempHigh.toFixed(0)}°</div></div>
              <div style="text-align: center;"><div style="font-size: 10px; color: var(--muted); text-transform: uppercase;">Low</div><div style="font-size: 24px; font-weight: 700;">${d.tempLow.toFixed(0)}°</div></div>
              <div style="text-align: center;"><div style="font-size: 10px; color: var(--muted); text-transform: uppercase;">Avg</div><div style="font-size: 24px; font-weight: 700;">${d.tempMean.toFixed(0)}°</div></div>
              <div style="text-align: center;"><div style="font-size: 10px; color: var(--muted); text-transform: uppercase;">Feels</div><div style="font-size: 24px; font-weight: 700;">${(d.feelsLikeHigh || d.tempHigh + 2).toFixed(0)}°</div></div>
              <div style="text-align: center;"><div style="font-size: 10px; color: var(--muted); text-transform: uppercase;">Precip</div><div style="font-size: 24px; font-weight: 700; color: var(--chart-1);">${d.precipitation.toFixed(1)}mm</div></div>
              <div style="text-align: center;"><div style="font-size: 10px; color: var(--muted); text-transform: uppercase;">Humidity</div><div style="font-size: 24px; font-weight: 700;">${d.humidity}%</div></div>
              <div style="text-align: center;"><div style="font-size: 10px; color: var(--muted); text-transform: uppercase;">Wind</div><div style="font-size: 24px; font-weight: 700;">${d.windSpeed.toFixed(0)}</div></div>
              <div style="text-align: center;"><div style="font-size: 10px; color: var(--muted); text-transform: uppercase;">UV</div><div style="font-size: 24px; font-weight: 700;">${d.uvIndex.toFixed(1)}</div></div>
            </div>
          </div>

          <!-- HEAT DETAILS — colorful card box -->
          ${d.peakHeat && d.peakHeat.temp ? `
          <div style="margin-top: 12px; padding: 14px; border-radius: 12px; background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.06)); border: 1px solid rgba(239,68,68,0.2);">
            <div style="font-size: 11px; color: #ef4444; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; font-weight: 700;">
              🔥 Heat Details ${d.heatSummary && d.hotHours && d.hotHours.length > 0 ? `— Hot hours: ${d.heatSummary}` : ''}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <div style="padding: 8px 14px; border-radius: 10px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); font-size: 13px; font-weight: 500;">
                🔥 <strong style="color: #ef4444;">Peak:</strong> <span style="font-size: 16px; font-weight: 700; color: #ef4444;">${d.peakHeat.temp.toFixed(0)}°C</span> at ${d.peakHeat.time}
              </div>
              <div style="padding: 8px 14px; border-radius: 10px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); font-size: 13px; font-weight: 500;">
                ❄️ <strong style="color: #3b82f6;">Coolest:</strong> <span style="font-size: 16px; font-weight: 700; color: #3b82f6;">${d.coldestHour.temp.toFixed(0)}°C</span> at ${d.coldestHour.time}
              </div>
              ${d.feelsLikeHigh ? `<div style="padding: 8px 14px; border-radius: 10px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); font-size: 13px; font-weight: 500;">🌡️ <strong style="color: #f59e0b;">Feels like:</strong> <span style="font-size: 16px; font-weight: 700; color: #f59e0b;">${d.feelsLikeHigh.toFixed(0)}°C</span></div>` : ''}
              ${d.humidity ? `<div style="padding: 8px 14px; border-radius: 10px; background: rgba(6,182,212,0.15); border: 1px solid rgba(6,182,212,0.3); font-size: 13px; font-weight: 500;">💧 <strong style="color: #06b6d4;">Humidity:</strong> <span style="font-size: 16px; font-weight: 700; color: #06b6d4;">${d.humidity}%</span></div>` : ''}
              ${d.uvIndex ? `<div style="padding: 8px 14px; border-radius: 10px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); font-size: 13px; font-weight: 500;">☀️ <strong style="color: #f59e0b;">UV:</strong> <span style="font-size: 16px; font-weight: 700; color: #f59e0b;">${d.uvIndex.toFixed(1)}</span></div>` : ''}
            </div>
            ${d.hotHours && d.hotHours.length > 0 ? `
            <div style="margin-top: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(239,68,68,0.1); font-size: 12px; color: #ef4444;">
              ⚠️ <strong>${d.hotHours.length} hour${d.hotHours.length > 1 ? 's' : ''} of excessive heat (≥35°C):</strong> ${d.hotHours.map((h) => h.time).join(', ')}
            </div>` : ''}
          </div>` : ''}

          <!-- HOURLY TEMPERATURE — colorful card box -->
          ${d.heatHours && d.heatHours.length > 0 ? `
          <div style="margin-top: 12px; padding: 14px; border-radius: 12px; background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.04)); border: 1px solid rgba(245,158,11,0.2);">
            <div style="font-size: 11px; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; font-weight: 700;">🌡️ Hourly Temperature (Real data)</div>
            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
              ${d.heatHours.map((h) => {
                const hClr = h.temp >= 35 ? '#ef4444' : h.temp >= 30 ? '#f59e0b' : h.temp >= 20 ? '#10b981' : h.temp >= 10 ? '#06b6d4' : '#3b82f6';
                const hBg = h.temp >= 35 ? 'rgba(239,68,68,0.15)' : h.temp >= 30 ? 'rgba(245,158,11,0.15)' : h.temp >= 20 ? 'rgba(16,185,129,0.15)' : h.temp >= 10 ? 'rgba(6,182,212,0.15)' : 'rgba(59,130,246,0.15)';
                const hBorder = h.temp >= 35 ? 'rgba(239,68,68,0.3)' : h.temp >= 30 ? 'rgba(245,158,11,0.3)' : h.temp >= 20 ? 'rgba(16,185,129,0.3)' : h.temp >= 10 ? 'rgba(6,182,212,0.3)' : 'rgba(59,130,246,0.3)';
                return `<div style="padding: 6px 10px; border-radius: 8px; background: ${hBg}; border: 1px solid ${hBorder}; font-size: 11px; min-width: 56px; text-align: center; transition: transform 200ms;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><div style="color: var(--muted); font-size: 9px;">${h.time}</div><div style="color: ${hClr}; font-weight: 700; font-size: 13px;">${h.temp.toFixed(0)}°</div></div>`;
              }).join('')}
            </div>
          </div>` : ''}

          <!-- RAIN DETAILS — colorful card box -->
          ${d.rainHours && d.rainHours.length > 0 ? `
          <div style="margin-top: 12px; padding: 14px; border-radius: 12px; background: linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.06)); border: 1px solid rgba(6,182,212,0.2);">
            <div style="font-size: 11px; color: #06b6d4; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; font-weight: 700;">🌧️ Rain Hours — ${d.rainSummary} (Real data)</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${d.rainHours.map((rh) => `
                <div style="padding: 8px 12px; border-radius: 10px; background: rgba(6,182,212,0.15); border: 1px solid rgba(6,182,212,0.3); font-size: 12px; transition: transform 200ms;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                  <strong style="color: #06b6d4; font-size: 13px;">${rh.time}</strong><br>
                  <span style="color: var(--fg); font-weight: 600;">${rh.precipMm}mm</span> · <span style="color: var(--muted);">${rh.probability}%</span>
                </div>
              `).join('')}
            </div>
          </div>` : '<div style="margin-top: 12px; padding: 14px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); font-size: 13px; color: var(--muted);">🌧️ No rain expected on this day.</div>'}
          ${d.sunrise ? `<div style="margin-top: 10px; padding: 10px 14px; border-radius: 10px; background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(236,72,153,0.06)); border: 1px solid rgba(245,158,11,0.2); font-size: 13px; color: var(--muted);">🌅 <strong>Sunrise:</strong> ${fmtTime(d.sunrise)} · 🌇 <strong>Sunset:</strong> ${fmtTime(d.sunset)}</div>` : ''}
        </div>
      `;
    });
  });
}

function renderMetricCard(icon, label, value, unit, footer, color) {
  const c = color || 'var(--accent)';
  return `
    <div class="metric-card" style="border-color: ${c}33;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <div class="metric-label">${label}</div>
          <div class="metric-value" style="color: ${c};">${value}<span class="metric-unit">${unit}</span></div>
        </div>
        <div style="font-size: 22px; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: ${c}22;">${icon}</div>
      </div>
      ${footer ? `<div class="metric-footer">${footer}</div>` : ''}
    </div>
  `;
}

async function renderHourlyChart(tab) {
  try {
    if (state.hourly.length === 0) {
      const data = await API.getHourly(state.selectedCity.name, 24);
      state.hourly = data.hourly || [];
    }
    // Show ALL 24 hours — every single hour
    const data = state.hourly.map((h) => {
      const hour12 = h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour;
      const ampm = h.hour < 12 ? 'am' : 'pm';
      return { label: `${hour12} ${ampm}`, value: tab === 'temp' ? h.temp : tab === 'precip' ? h.precipitation : h.windSpeed };
    });
    const canvas = document.getElementById('hourlyChart');
    if (!canvas) return;
    if (tab === 'wind') {
      Charts.bars(canvas, data, { color: '#34d399', valueSuffix: '' });
    } else {
      Charts.area(canvas, data, {
        color: tab === 'temp' ? '#fbbf24' : '#06b6d4',
        fill: tab === 'temp' ? '#fbbf24' : '#06b6d4',
        showDots: false,
        valueSuffix: tab === 'temp' ? '°' : 'mm',
      });
    }
  } catch (e) {
    console.error('Hourly chart error:', e);
  }
}

// === Prediction view ===
async function renderPrediction(container) {
  container.innerHTML = `<div class="view"><div class="loading">Loading model info...</div></div>`;
  let metrics = null;
  try { metrics = (await API.getMetrics()).metrics; } catch {}

  const features = [
    { key: 'temperature', label: '🌡️ Temperature', min: -10, max: 45, step: 0.5, unit: '°C', default: 25, hint: 'Hotter = Sunny/Hot' },
    { key: 'humidity', label: '💧 Humidity', min: 0, max: 100, step: 1, unit: '%', default: 55, hint: 'Higher = Rainy/Stormy' },
    { key: 'windSpeed', label: '💨 Wind Speed', min: 0, max: 60, step: 0.5, unit: 'km/h', default: 12, hint: 'Strong = Stormy' },
    { key: 'pressure', label: '📊 Pressure', min: 980, max: 1040, step: 0.5, unit: 'hPa', default: 1013, hint: 'Low = Stormy/Rainy' },
    { key: 'cloudCover', label: '☁️ Cloud Cover', min: 0, max: 100, step: 1, unit: '%', default: 30, hint: 'High = Cloudy/Rainy' },
    { key: 'visibility', label: '👁️ Visibility', min: 0, max: 25, step: 0.1, unit: 'km', default: 12, hint: 'Low = Foggy' },
  ];

  container.innerHTML = `
    <div class="view">
      <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 28px; font-weight: 700;">Weather Prediction</h1>
          <p style="font-size: 13px; color: var(--muted); margin-top: 4px;">Move the sliders — prediction updates automatically</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" class="prediction-grid">
        <!-- LEFT: Sliders -->
        <div class="card">
          <div class="card-title">Input Features — drag to change</div>
          ${features.map((f) => `
            <div class="slider-group">
              <div class="slider-header">
                <span class="slider-label">${f.label} <span style="font-size: 10px; color: var(--muted); font-weight: normal;">(${f.hint})</span></span>
                <span class="slider-value" id="${f.key}-val" style="background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: white; padding: 4px 12px; border-radius: 8px; font-weight: 700;">${f.default.toFixed(f.step < 1 ? 1 : 0)} ${f.unit}</span>
              </div>
              <input type="range" id="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.default}" data-unit="${f.unit}" data-step="${f.step}" />
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--muted); margin-top: 4px;">
                <span>${f.min}${f.unit}</span><span>${f.max}${f.unit}</span>
              </div>
            </div>
          `).join('')}
          <div style="margin-top: 12px; padding: 10px; border-radius: 10px; background: var(--glass-bg); font-size: 11px; color: var(--muted); text-align: center;">
            💡 Prediction updates automatically as you move sliders
          </div>
        </div>

        <!-- RIGHT: Prediction result — clean layout matching screenshot -->
        <div>
          <div class="card">
            <div class="card-title">Prediction Result</div>
            <div id="predictionResult" style="padding: 20px 0;">
              <div style="font-size: 48px; opacity: 0.3; text-align: center;">🧠</div>
              <p style="font-size: 13px; margin-top: 12px; color: var(--muted); text-align: center;">Move any slider to see prediction...</p>
            </div>
          </div>

          ${metrics ? `
          <div class="card">
            <div class="card-title">Model Information</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
              <div><strong>Algorithm:</strong> Random Forest</div>
              <div><strong>Trees:</strong> ${metrics.nEstimators}</div>
              <div><strong>Max Depth:</strong> ${metrics.maxDepth}</div>
              <div><strong>Features:</strong> 6</div>
              <div><strong>Classes:</strong> 6</div>
              <div><strong>Accuracy:</strong> ${(metrics.accuracy * 100).toFixed(1)}% ✅</div>
              <div><strong>Train samples:</strong> ${metrics.trainingSamples}</div>
              <div><strong>Test samples:</strong> ${metrics.testSamples}</div>
            </div>
            <div style="margin-top: 16px;">
              <div class="card-title" style="margin-bottom: 8px;">Feature Importance — what matters most</div>
              ${(metrics.featureImportance || []).sort((a, b) => b.importance - a.importance).map((f) => `
                <div class="prob-bar">
                  <div class="prob-label">${f.feature}</div>
                  <div class="prob-track"><div class="prob-fill" style="width: ${f.importance * 100}%; background: linear-gradient(90deg, var(--accent), var(--accent-2));"></div></div>
                  <div class="prob-value">${(f.importance * 100).toFixed(1)}%</div>
                </div>
              `).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;

  // Live prediction — auto-predict on slider change (debounced)
  let predictTimer = null;
  async function autoPredict() {
    const payload = {};
    features.forEach((f) => { payload[f.key] = parseFloat(document.getElementById(f.key).value); });
    try {
      const r = await API.predict(payload);
      const clr = CONDITION_COLORS[r.prediction] || CONDITION_COLORS.Sunny;
      const probs = Object.entries(r.probabilities).sort((a, b) => b[1] - a[1]);
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference * (1 - r.confidence);
      document.getElementById('predictionResult').innerHTML = `
        <!-- Big icon + condition name + confidence circle — like screenshot -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; margin-bottom: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 72px; line-height: 1;">${CONDITION_ICONS[r.prediction] || '☀️'}</div>
            <div style="font-size: 28px; font-weight: 700; color: ${clr}; margin-top: 8px;">${r.prediction}</div>
            <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px;">Predicted Class</div>
          </div>
          <div class="gauge-container">
            <div class="gauge">
              <svg width="130" height="130">
                <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${clr}"/><stop offset="100%" stop-color="${clr}88"/></linearGradient></defs>
                <circle cx="65" cy="65" r="${radius}" stroke="rgba(128,128,128,0.15)" stroke-width="12" fill="none"/>
                <circle cx="65" cy="65" r="${radius}" stroke="url(#gg)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" style="transition: stroke-dashoffset 600ms ease;"/>
              </svg>
              <div class="gauge-text"><div class="gauge-value" style="font-size: 22px; color: ${clr};">${(r.confidence * 100).toFixed(1)}%</div><div class="gauge-label">Confidence</div></div>
            </div>
          </div>
        </div>

        <!-- AI Recommendation -->
        <div style="padding: 12px 16px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); margin-bottom: 16px;">
          <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">🤖 AI Recommendation</div>
          <div style="font-size: 13px; color: var(--fg);">${r.recommendation}</div>
        </div>

        <!-- Class Probabilities — colored dots + bars like screenshot -->
        <div>
          <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px;">Class Probabilities</div>
          ${probs.map(([cls, p]) => {
            const pClr = CONDITION_COLORS[cls] || 'var(--accent)';
            return `
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background: ${pClr}; flex-shrink: 0;"></div>
                <span style="font-size: 13px; width: 70px; font-weight: 500;">${cls}</span>
                <div style="flex: 1; height: 8px; border-radius: 4px; background: rgba(128,128,128,0.1); overflow: hidden;">
                  <div style="height: 100%; border-radius: 4px; background: ${pClr}; width: ${p * 100}%; transition: width 500ms ease;"></div>
                </div>
                <span style="font-size: 13px; font-weight: 700; width: 50px; text-align: right;">${(p * 100).toFixed(1)}%</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (e) {
      // silent
    }
  }

  // Wire sliders — auto-predict on every change (debounced 300ms)
  features.forEach((f) => {
    const slider = document.getElementById(f.key);
    const val = document.getElementById(`${f.key}-val`);
    slider.addEventListener('input', () => {
      val.textContent = `${parseFloat(slider.value).toFixed(f.step < 1 ? 1 : 0)} ${f.unit}`;
      clearTimeout(predictTimer);
      predictTimer = setTimeout(autoPredict, 300);
    });
  });

  // Auto-predict once on load
  autoPredict();
}

// === Forecast Analytics view ===
async function renderForecast(container) {
  container.innerHTML = `<div class="view"><div class="loading">Loading analytics...</div></div>`;
  try {
    const [forecastData, hourlyData] = await Promise.all([
      API.getForecast(state.selectedCity.name, 30).catch(() => ({ forecast: [] })),
      API.getHourly(state.selectedCity.name, 24).catch(() => ({ hourly: [] })),
    ]);
    const forecast = forecastData.forecast || [];
    const hourly = hourlyData.hourly || [];
    const today = new Date().toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="view">
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em;">📈 ${state.selectedCity.name}, ${state.selectedCity.country}</div>
            <h1 style="font-size: 28px; font-weight: 700; margin-top: 4px;">Forecast Analytics</h1>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-outline btn btn-sm" data-range="24h">Today</button>
            <button class="btn-outline btn btn-sm" data-range="7d">7 Days</button>
            <button class="btn-outline btn btn-sm" data-range="30d">30 Days</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">🌡️ Temperature Trend · 24h</div>
          <div class="chart-container"><canvas id="tempChart"></canvas></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" class="forecast-charts-grid">
          <div class="card">
            <div class="card-title">💧 Humidity Trend · 24h</div>
            <div class="chart-container"><canvas id="humChart"></canvas></div>
          </div>
          <div class="card">
            <div class="card-title">💨 Wind Speed · 24h</div>
            <div class="chart-container"><canvas id="windChart"></canvas></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">📅 Weekly Forecast · High/Low</div>
          <div class="chart-container"><canvas id="weeklyChart"></canvas></div>
        </div>

        <div class="card">
          <div class="card-title">📊 Monthly Trend · 30 days</div>
          <div class="chart-container"><canvas id="monthlyChart"></canvas></div>
        </div>

        ${forecast.length > 0 ? `
        <div class="card">
          <div class="card-title">Summary · ${state.selectedCity.name}</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
            <div style="text-align: center; padding: 12px; border-radius: 12px; background: var(--glass-bg);"><div style="font-size: 11px; color: var(--muted);">Avg Temp</div><div style="font-size: 24px; font-weight: 700; color: var(--chart-1);">${(forecast.reduce((s, d) => s + d.tempMean, 0) / forecast.length).toFixed(1)}°</div></div>
            <div style="text-align: center; padding: 12px; border-radius: 12px; background: var(--glass-bg);"><div style="font-size: 11px; color: var(--muted);">Max Temp</div><div style="font-size: 24px; font-weight: 700; color: var(--chart-3);">${Math.max(...forecast.map((d) => d.tempHigh)).toFixed(1)}°</div></div>
            <div style="text-align: center; padding: 12px; border-radius: 12px; background: var(--glass-bg);"><div style="font-size: 11px; color: var(--muted);">Min Temp</div><div style="font-size: 24px; font-weight: 700; color: var(--chart-1);">${Math.min(...forecast.map((d) => d.tempLow)).toFixed(1)}°</div></div>
            <div style="text-align: center; padding: 12px; border-radius: 12px; background: var(--glass-bg);"><div style="font-size: 11px; color: var(--muted);">Total Precip</div><div style="font-size: 24px; font-weight: 700; color: var(--chart-4);">${forecast.reduce((s, d) => s + d.precipitation, 0).toFixed(1)}mm</div></div>
            <div style="text-align: center; padding: 12px; border-radius: 12px; background: var(--glass-bg);"><div style="font-size: 11px; color: var(--muted);">Rainy Days</div><div style="font-size: 24px; font-weight: 700; color: var(--chart-5);">${forecast.filter((d) => ['Rainy', 'Stormy'].includes(d.condition)).length}</div></div>
          </div>
        </div>` : ''}
      </div>
    `;

    // Draw charts
    Charts.area(document.getElementById('tempChart'), hourly.map((h) => {
      const h12 = h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour;
      return { label: `${h12}${h.hour < 12 ? 'a' : 'p'}`, value: h.temp };
    }), { color: '#fbbf24', fill: '#fbbf24', showDots: true, valueSuffix: '°' });

    Charts.area(document.getElementById('humChart'), hourly.map((h) => {
      const h12 = h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour;
      return { label: `${h12}${h.hour < 12 ? 'a' : 'p'}`, value: h.humidity };
    }), { color: '#a78bfa', fill: '#a78bfa', valueSuffix: '%' });

    Charts.bars(document.getElementById('windChart'), hourly.map((h) => {
      const h12 = h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour;
      return { label: `${h12}${h.hour < 12 ? 'a' : 'p'}`, value: h.windSpeed };
    }), { color: '#34d399' });

    Charts.bars(document.getElementById('weeklyChart'), forecast.slice(0, 7).map((d) => ({
      label: d.weekday, value: d.tempHigh,
    })), { color: '#fbbf24', valueSuffix: '°' });

    Charts.area(document.getElementById('monthlyChart'), forecast.map((d) => ({
      label: d.date.slice(5), value: d.tempMean,
    })), { color: '#22d3ee', fill: '#22d3ee', valueSuffix: '°' });
  } catch (e) {
    container.innerHTML = `<div class="view"><div class="empty-state">${e.message}</div></div>`;
  }
}

// === Historical view ===
async function renderHistorical(container) {
  container.innerHTML = `<div class="view"><div class="loading">Loading historical data...</div></div>`;
  try {
    const data = await API.getHistory(state.selectedCity.name, 90);
    const rows = data.rows || [];
    container.innerHTML = `
      <div class="view">
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em;">📜 90-day archive</div>
            <h1 style="font-size: 28px; font-weight: 700; margin-top: 4px;">Historical Data · ${state.selectedCity.name}</h1>
          </div>
          <button class="btn" id="exportCsvBtn">📥 Export CSV</button>
        </div>
        <div class="card">
          <div class="card-title">Records (${rows.length})</div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>Condition</th><th>Temp</th><th>High</th><th>Low</th><th>Humidity</th><th>Wind</th><th>Precip</th></tr></thead>
              <tbody>
                ${rows.map((r) => `
                  <tr>
                    <td>${r.date}</td>
                    <td><span class="condition-pill" style="background: ${(CONDITION_COLORS[r.condition] || '#888').replace('var(', '').replace(')', '')}22; color: ${CONDITION_COLORS[r.condition] || '#888'};">${r.condition}</span></td>
                    <td>${r.temp.toFixed(1)}°</td>
                    <td>${r.tempHigh.toFixed(1)}°</td>
                    <td>${r.tempLow.toFixed(1)}°</td>
                    <td>${r.humidity}%</td>
                    <td>${r.windSpeed.toFixed(1)}</td>
                    <td>${r.precipitation.toFixed(1)}mm</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      if (rows.length === 0) { toast('No data to export', 'error'); return; }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => {
        const v = r[h]; if (v == null) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `ym-history-${state.selectedCity.name.toLowerCase().replace(/\s/g, '-')}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast(`Exported ${rows.length} rows to CSV`, 'success');
    });
  } catch (e) {
    container.innerHTML = `<div class="view"><div class="empty-state">${e.message}</div></div>`;
  }
}

// === Alerts view ===
async function renderAlerts(container) {
  container.innerHTML = `<div class="view"><div class="loading">Loading alerts...</div></div>`;
  try {
    const [alertsData, recsData] = await Promise.all([
      API.getAlerts(),
      API.getRecommendations(state.selectedCity.name).catch(() => ({ recommendations: [] })),
    ]);
    const alerts = alertsData.alerts || [];
    const recs = recsData.recommendations || [];
    container.innerHTML = `
      <div class="view">
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em;">🔔 Severe weather monitoring</div>
            <h1 style="font-size: 28px; font-weight: 700; margin-top: 4px;">Weather Alerts</h1>
          </div>
          <button class="btn" id="createAlertBtn">+ Create Alert</button>
        </div>
        <div class="card">
          <div class="card-title">Active Alerts (${alerts.length})</div>
          ${alerts.length === 0 ? `<div class="empty-state">No active alerts. Weather looks clear for ${state.selectedCity.name}.</div>` :
            alerts.map((a) => `
              <div class="alert-banner ${a.severity === 'extreme' ? 'danger' : a.severity === 'severe' ? 'warning' : 'info'}">
                <div class="alert-icon">${a.type === 'storm' ? '⛈️' : a.type === 'heat' ? '🔥' : a.type === 'frost' ? '❄️' : a.type === 'wind' ? '💨' : a.type === 'fog' ? '🌫️' : a.type === 'auto-rain' ? '🌧️' : '🔔'}</div>
                <div style="flex: 1;">
                  <div class="alert-title">${a.title}</div>
                  ${a.message ? `<div class="alert-msg">${a.message}</div>` : ''}
                  <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">📍 ${a.region || 'Global'} · Expires ${new Date(a.expiresAt).toLocaleString()}</div>
                </div>
                <button class="icon-btn" data-delete="${a._id}" title="Delete">🗑️</button>
              </div>
            `).join('')}
        </div>
        <div class="card">
          <div class="card-title">AI Warnings · ${state.selectedCity.name}</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px;">
            ${recs.map((r) => `
              <div style="padding: 10px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--glass-border);">
                <div style="font-size: 13px; font-weight: 500;">${r.title}</div>
                <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">${r.message}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try { await API.deleteAlert(btn.dataset.delete); toast('Alert deleted', 'success'); renderAlerts(container); }
        catch (e) { toast(e.message, 'error'); }
      });
    });
    document.getElementById('createAlertBtn').addEventListener('click', async () => {
      const title = prompt('Alert title:');
      if (!title) return;
      try {
        await API.createAlert({
          type: 'storm', severity: 'moderate', title,
          message: '', region: state.selectedCity.name,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        });
        toast('Alert created', 'success'); renderAlerts(container);
      } catch (e) { toast(e.message, 'error'); }
    });
  } catch (e) {
    container.innerHTML = `<div class="view"><div class="empty-state">${e.message}</div></div>`;
  }
}

// === Reports view ===
function renderReports(container) {
  container.innerHTML = `
    <div class="view">
      <div class="card">
        <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em;">📄 Generate & export</div>
        <h1 style="font-size: 28px; font-weight: 700; margin-top: 4px;">Reports · ${state.selectedCity.name}</h1>
      </div>
      <div class="card">
        <div class="card-title">Weather Report</div>
        ${state.weather ? `
          <p style="font-size: 14px; line-height: 1.6;">
            <strong>${state.weather.city}, ${state.weather.country}</strong> — ${state.weather.temp}°C, ${state.weather.condition}.<br>
            Feels like ${state.weather.feelsLike.toFixed(0)}°C. Humidity ${state.weather.humidity}%, Wind ${state.weather.windSpeed} km/h.<br>
            Pressure ${state.weather.pressure} hPa, UV ${state.weather.uvIndex}, AQI ${state.weather.aqi}.<br>
            Sunrise ${fmtTime(state.weather.sunrise)}, Sunset ${fmtTime(state.weather.sunset)}.<br>
            <em>Generated: ${new Date().toLocaleString()}</em>
          </p>
        ` : '<p>No weather data loaded. Go to Dashboard first.</p>'}
        <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn" onclick="window.print()">📥 Download PDF</button>
          <button class="btn-outline btn" id="emailReportBtn">📧 Email Report</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('emailReportBtn').addEventListener('click', () => {
    const email = prompt('Recipient email:');
    if (email) toast(`Report emailed to ${email} (mock send)`, 'success');
  });
}

// === Settings view ===
async function renderSettings(container) {
  container.innerHTML = `<div class="view"><div class="loading">Loading profile...</div></div>`;
  let user = null;
  try { user = (await API.getProfile()).user; } catch {}

  container.innerHTML = `
    <div class="view">
      <div class="card">
        <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em;">⚙️ Configuration</div>
        <h1 style="font-size: 28px; font-weight: 700; margin-top: 4px;">Settings</h1>
      </div>

      <div class="card">
        <div class="card-title">Profile</div>
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
          <div class="avatar" style="width: 64px; height: 64px; font-size: 20px;">BP</div>
          <div>
            <div style="font-size: 18px; font-weight: 700;">${user?.name || 'BP Bandi Pavani'}</div>
            <div style="font-size: 13px; color: var(--muted);">${user?.email || 'admin@yathinmeteora.app'}</div>
            <div style="font-size: 10px; color: var(--accent); margin-top: 4px; letter-spacing: 0.1em;">A YATHIN INFOTECH PRODUCT · INNOVATE · INTEGRATE · ELEVATE</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Display Name</label>
          <input type="text" class="form-input" id="profileName" value="${user?.name || 'BP Bandi Pavani'}" />
        </div>
        <div class="form-group">
          <label class="form-label">Bio</label>
          <textarea class="form-textarea" id="profileBio" rows="3">${user?.bio || ''}</textarea>
        </div>
        <button class="btn" id="saveProfileBtn">💾 Save</button>
      </div>

      <div class="card">
        <div class="card-title">About Yathin Meteora</div>
        <p style="font-size: 13px; line-height: 1.6; color: var(--muted);">
          <strong style="color: var(--fg);">Yathin Meteora</strong> v1.0.0 — Real-Time Weather Prediction Platform<br>
          Built by <strong style="color: var(--fg);">BP Bandi Pavani</strong> · A Yathin Infotech Private Limited product<br><br>
          <strong style="color: var(--fg);">Tech Stack:</strong> HTML5, CSS3, JavaScript, Node.js, Express.js, MongoDB, Python, scikit-learn, joblib, Random Forest Classifier<br><br>
          Real weather data from <a href="https://open-meteo.com" target="_blank" style="color: var(--accent);">Open-Meteo</a> (100% free, no API key).
        </p>
      </div>
    </div>
  `;
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    try {
      await API.updateProfile({
        name: document.getElementById('profileName').value,
        bio: document.getElementById('profileBio').value,
      });
      toast('Profile saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}

// === Init ===
(async function init() {
  await fetchWeather();
  renderView();
  // Live updates every 60s
  setInterval(async () => {
    await fetchWeather();
    if (state.view === 'dashboard') renderView();
  }, 60000);
})();
