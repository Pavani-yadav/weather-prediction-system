/** server/models/FavoriteLocation.js — Saved favorite cities */
'use strict';
const mongoose = require('mongoose');

const favoriteLocationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  city: { type: String, required: true },
  country: { type: String, default: '' },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
}, { timestamps: true });

favoriteLocationSchema.index({ userId: 1, city: 1 }, { unique: true });

module.exports = mongoose.model('FavoriteLocation', favoriteLocationSchema);
