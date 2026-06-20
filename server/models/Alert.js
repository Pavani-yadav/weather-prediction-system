/** server/models/Alert.js — Weather alerts */
'use strict';
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: { type: String, default: null, index: true },
  type: {
    type: String,
    enum: ['storm', 'heat', 'frost', 'flood', 'wind', 'fog', 'uv', 'aqi', 'auto-rain'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['extreme', 'severe', 'moderate', 'minor'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  region: { type: String, default: '' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
