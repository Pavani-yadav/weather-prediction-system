/** server/models/SearchHistory.js — Per-user city search history */
'use strict';
const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  city: { type: String, required: true },
  country: { type: String, default: '' },
  condition: { type: String, default: null },
  temp: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
