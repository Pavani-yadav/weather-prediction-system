/** server/models/WeatherSnapshot.js — Cached weather observations per city */
'use strict';
const mongoose = require('mongoose');

const weatherSnapshotSchema = new mongoose.Schema({
  city: { type: String, required: true, index: true },
  country: { type: String, default: '' },
  temp: { type: Number, required: true },
  humidity: { type: Number, required: true },
  pressure: { type: Number, required: true },
  windSpeed: { type: Number, required: true },
  visibility: { type: Number, required: true },
  uvIndex: { type: Number, required: true },
  aqi: { type: Number, required: true },
  cloudCover: { type: Number, default: 0 },
  condition: { type: String, required: true },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

weatherSnapshotSchema.index({ city: 1, recordedAt: -1 });

module.exports = mongoose.model('WeatherSnapshot', weatherSnapshotSchema);
