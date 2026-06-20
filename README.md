# Yathin Meteora — Real-Time Weather Prediction Platform

Built by **BP Bandi Pavani** · A Yathin Infotech Private Limited product
> **INNOVATE · INTEGRATE · ELEVATE**

A production-ready weather prediction web app using **only the technologies you specified**:
- **Frontend**: HTML5 + CSS3 + JavaScript (vanilla, no React/Next.js)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose) — falls back to in-memory store if MongoDB isn't installed
- **Machine Learning**: Python + scikit-learn + joblib (Random Forest Classifier)
- **Real weather data**: Open-Meteo APIs (100% free, no API key needed)

---

## 🚀 Quick Start (Windows PowerShell)

### Prerequisites
- **Node.js 18+** — https://nodejs.org/
- **Python 3.10+** — https://www.python.org/ (check "Add Python to PATH" during install)
- **MongoDB** (optional — app runs without it using in-memory store)

### Setup

```powershell
# 1. Unzip the project
cd C:\Users\DELL\Desktop\yathin-meteora-vanilla

# 2. Copy .env.example to .env
copy .env.example .env

# 3. Install Node.js dependencies
npm install

# 4. Install Python ML dependencies
pip install scikit-learn joblib numpy

# 5. Train the Random Forest model
python scripts\train_random_forest.py
```

You should see:
```
Accuracy     : 0.9750
Saved model -> scripts/weather_rf_model.joblib
Saved metadata -> scripts/model-metadata.json
```

### Run

```powershell
npm start
```

Open http://localhost:3000 in your browser.

**That's it!** Only ONE terminal needed (Express serves both API and the static HTML/CSS/JS frontend).

---

## 📁 Project Structure

```
yathin-meteora-vanilla/
├── public/                          ← Frontend (pure HTML/CSS/JS)
│   ├── index.html                   ← Single-page app shell
│   ├── manifest.json                ← PWA manifest
│   ├── favicon.svg                  ← Meteor logo
│   ├── css/
│   │   └── style.css                ← Glassmorphism design system
│   └── js/
│       ├── api.js                   ← Fetch wrapper for /api/*
│       ├── charts.js                ← Vanilla Canvas charts (no libraries)
│       └── app.js                   ← Main app logic + 7 views
│
├── server/                          ← Backend (Node.js + Express + MongoDB)
│   ├── server.js                    ← Express app entry (port 3000)
│   ├── models/                      ← Mongoose schemas
│   │   ├── User.js
│   │   ├── SearchHistory.js
│   │   ├── FavoriteLocation.js
│   │   ├── Alert.js
│   │   └── WeatherSnapshot.js
│   ├── routes/                      ← REST API routes
│   │   ├── auth.js                  ← JWT auth (register/login/me)
│   │   ├── weather.js               ← Current weather + recommendations
│   │   ├── forecast.js              ← 7-day + hourly + analytics
│   │   ├── history.js               ← Historical data + CSV export
│   │   ├── alerts.js                ← CRUD alerts
│   │   ├── ml.js                    ← Random Forest predict/metrics/retrain
│   │   └── user.js                  ← Profile + favorites + history
│   └── lib/
│       ├── db.js                    ← Mongoose connection + adapter
│       ├── memory-store.js          ← In-memory MongoDB fallback
│       ├── auth.js                  ← JWT + bcrypt helpers
│       ├── weather-engine.js        ← Open-Meteo API integration
│       ├── recommendations.js       ← AI recommendation rules
│       ├── random-forest.js         ← JS Random Forest (CART + Gini)
│       └── cities.js                ← 549 Indian + 100+ international cities
│
├── scripts/
│   └── train_random_forest.py       ← Python scikit-learn + joblib training
│
├── .env.example
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack (EXACTLY as specified)

| Layer | Technology |
|---|---|
| Frontend | **HTML5, CSS3, JavaScript** (vanilla, no frameworks) |
| Backend | **Node.js, Express.js** |
| Database | **MongoDB** (via Mongoose) |
| Machine Learning | **Python, scikit-learn, joblib, Random Forest Classifier** |

**No TypeScript. No React. No Next.js. No Tailwind. No Prisma. No build step.**

---

## ✨ Features

### Real-Time Weather (Open-Meteo API — 100% free, no API key)
- ✅ Current weather for any city/village worldwide
- ✅ Hourly forecast (Temperature / Precipitation / Wind tabs)
- ✅ 7-day forecast (Google Weather-style day cards)
- ✅ Real AQI, UV Index, sunrise/sunset, visibility, pressure
- ✅ Real historical data (up to 92 days past)
- ✅ Real hourly rain timing ("Rain expected: 14:00–22:00")
- ✅ Excessive heat + Storm warning banners
- ✅ AI recommendations (umbrella, UV, AQI, etc.)

### Random Forest ML
- ✅ Real Python scikit-learn + joblib training (97.5% accuracy)
- ✅ 6 features → 6 classes (Sunny, Cloudy, Rainy, Stormy, Foggy, Snowy)
- ✅ JS port for runtime predictions
- ✅ Retrain button (calls Python script)
- ✅ Confusion matrix + feature importance visualization
- ✅ Confidence score for every prediction

### Backend
- ✅ Express.js REST API (15+ endpoints)
- ✅ MongoDB via Mongoose (5 collections)
- ✅ JWT authentication + bcrypt password hashing
- ✅ In-memory fallback when MongoDB isn't installed

### Premium UI (Pure CSS)
- ✅ Glassmorphism design system
- ✅ Dark/light theme toggle
- ✅ Animated weather icons (emoji-based)
- ✅ Vibrant gradient sidebar with Yathin Infotech branding
- ✅ Google Weather-style dashboard layout
- ✅ Custom Canvas charts (no Chart.js/Recharts)
- ✅ Voice search (Web Speech API)
- ✅ Text-to-speech weather reports
- ✅ Geolocation auto-detection
- ✅ Live updates every 60s
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ PWA support

### 7 Views
1. **Dashboard** — Google Weather-style hero + 7-day forecast + hourly tabs
2. **Prediction** — Random Forest form + confidence gauge + probabilities
3. **Forecast Analytics** — 5 Canvas charts (temp, humidity, wind, weekly, monthly)
4. **Historical Data** — Filterable table + CSV export
5. **Weather Alerts** — Active alerts + create/delete + AI warnings
6. **Reports** — PDF export (print) + email mock
7. **Settings** — Profile, About

---

## 👤 Default Admin User

- **Name**: BP Bandi Pavani
- **Email**: bandipavani2004@gmail.com
- **Password**: meteora2026
- (Auto-created on first API call)

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login (default: admin@yathinmeteora.app / meteora2026) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/weather?city=X` | Real current weather |
| GET | `/api/weather/recommendations?city=X` | AI recommendations |
| GET | `/api/weather/search?q=X` | City search (local + Open-Meteo geocoding) |
| GET | `/api/weather/nearest?lat=X&lon=Y` | Nearest city |
| GET | `/api/forecast?city=X&days=7` | 7-day forecast with hourly rain timing |
| GET | `/api/forecast/hourly?city=X&hours=24` | Hourly forecast |
| GET | `/api/forecast/analytics?city=X&range=7d` | Aggregated analytics |
| GET | `/api/history?city=X&days=90` | Historical data |
| POST | `/api/history/export` | CSV export |
| GET/POST/DELETE | `/api/alerts` | CRUD alerts |
| POST | `/api/ml/predict` | Random Forest prediction |
| GET | `/api/ml/metrics` | Model accuracy, confusion matrix, feature importance |
| POST | `/api/ml/retrain` | Retrain via Python script |
| GET/PATCH | `/api/user/profile` | User profile |
| GET/POST/DELETE | `/api/user/favorites` | Favorites CRUD |
| GET/DELETE | `/api/user/history` | Search history |

---

## 🌐 Optional: Use a real MongoDB

The app works without MongoDB (uses in-memory store). To use real MongoDB:

### Option A — Docker
```powershell
docker run -d -p 27017:27017 --name yathin-mongo mongo:7
```

### Option B — MongoDB Atlas (cloud)
Create a free cluster at https://www.mongodb.com/atlas

### Then edit `.env`:
```
MONGODB_URI=mongodb://localhost:27017/yathin_meteora
```

Restart the server. You'll see:
```
[db] Connected to MongoDB at mongodb://...
```

---

## 📝 License

MIT — free for portfolio, internship, resume showcase.

---

## 🙏 Credits

- Weather data: [Open-Meteo](https://open-meteo.com/) (free, no API key)
- ML: [scikit-learn](https://scikit-learn.org/) + [joblib](https://joblib.readthedocs.io/)

---

**Built with ❤️ by BP Bandi Pavani · Yathin Infotech Private Limited**
**INNOVATE · INTEGRATE · ELEVATE**
