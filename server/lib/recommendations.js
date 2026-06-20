/**
 * server/lib/recommendations.js
 * Rule-based AI recommendations: inspect weather features → return actionable advice.
 */
'use strict';

function generateRecommendations(weather) {
  const recs = [];
  const { condition, temp, humidity, windSpeed, uvIndex, aqi, visibility, pressure, city } = weather;

  if (['Rainy', 'Stormy'].includes(condition)) {
    recs.push({
      level: 'info', icon: 'umbrella',
      title: 'Carry an umbrella today',
      message: `Precipitation expected in ${city}. Keep waterproof gear handy.`,
    });
  }
  if (condition === 'Stormy' || windSpeed > 30) {
    recs.push({
      level: 'warning', icon: 'wind',
      title: 'Strong winds expected',
      message: `Wind speeds up to ${windSpeed} km/h. Avoid outdoor activities.`,
    });
  }
  if (uvIndex >= 7) {
    recs.push({
      level: 'warning', icon: 'sun',
      title: 'High UV exposure expected',
      message: `UV index ${uvIndex}. Apply SPF 30+ sunscreen and wear sunglasses.`,
    });
  } else if (uvIndex >= 4) {
    recs.push({
      level: 'info', icon: 'sun',
      title: 'Moderate UV',
      message: `UV index ${uvIndex}. Sunscreen recommended for extended outdoor time.`,
    });
  }
  if (aqi > 150) {
    recs.push({
      level: 'danger', icon: 'air',
      title: 'Air quality unhealthy',
      message: `AQI ${aqi}. Sensitive groups should stay indoors.`,
    });
  } else if (aqi > 100) {
    recs.push({
      level: 'warning', icon: 'air',
      title: 'Air quality moderate',
      message: `AQI ${aqi}. Reduce prolonged outdoor exertion if sensitive.`,
    });
  }
  if (temp < 5) {
    recs.push({ level: 'warning', icon: 'thermometer', title: 'Cold weather alert', message: `Temperature ${temp}°C. Dress in layers.` });
  } else if (temp > 32) {
    recs.push({ level: 'warning', icon: 'thermometer', title: 'Heat advisory', message: `Temperature ${temp}°C. Stay hydrated and seek shade.` });
  }
  if (visibility < 3) {
    recs.push({ level: 'warning', icon: 'eye', title: 'Low visibility', message: `Visibility ${visibility} km. Drive cautiously.` });
  }
  if (condition === 'Sunny' && temp >= 18 && temp <= 30 && uvIndex < 7) {
    recs.push({ level: 'info', icon: 'smile', title: 'Perfect outdoor weather', message: `Pleasant conditions in ${city}. Great for parks and walks.` });
  }
  if (pressure < 1005) {
    recs.push({ level: 'info', icon: 'gauge', title: 'Low pressure system', message: 'Barometric pressure low — weather may shift rapidly.' });
  }
  if (humidity > 85 && temp > 25) {
    recs.push({ level: 'info', icon: 'droplet', title: 'High humidity', message: `Humidity ${humidity}%. Expect muggy conditions.` });
  }
  if (recs.length === 0) {
    recs.push({ level: 'info', icon: 'check', title: 'Weather looks fine', message: 'No notable advisories at this time.' });
  }
  return recs;
}

function recommendationForPrediction(prediction, features) {
  const [temp, humidity, windSpeed, pressure, cloudCover, visibility] = features;
  switch (prediction) {
    case 'Sunny': return temp > 30 ? 'Hot sunny day — stay hydrated and seek shade.' : 'Clear skies — great day for outdoor activities.';
    case 'Cloudy': return 'Overcast conditions expected — comfortable for travel and outdoor work.';
    case 'Rainy': return 'Carry an umbrella. Roads may be slippery — drive cautiously.';
    case 'Stormy': return 'Storm expected — avoid outdoor activities and secure loose objects.';
    case 'Foggy': return `Low visibility (${visibility} km). Drive cautiously and use fog lights.`;
    case 'Snowy': return 'Snowfall expected — dress warmly and check road conditions before travel.';
    default: return 'Weather conditions look normal.';
  }
}

module.exports = { generateRecommendations, recommendationForPrediction };
