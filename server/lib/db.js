/**
 * server/lib/db.js
 * MongoDB connection via Mongoose. Falls back to in-memory store when
 * MONGODB_URI is unset (so the app runs without a MongoDB install).
 */
'use strict';

const mongoose = require('mongoose');
const { memoryDb, isUsingMemory } = require('./memory-store');
const User = require('../models/User');
const SearchHistory = require('../models/SearchHistory');
const FavoriteLocation = require('../models/FavoriteLocation');
const Alert = require('../models/Alert');
const WeatherSnapshot = require('../models/WeatherSnapshot');

let connected = false;

async function connectDb() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI not set — using in-memory MongoDB-shaped fallback.');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    connected = true;
    console.log('[db] Connected to MongoDB at', uri.replace(/\/\/.*@/, '//***@'));
  } catch (err) {
    console.warn('[db] MongoDB connection failed, using in-memory store:', err.message);
  }
}

function adaptModel(model) {
  return {
    async create(data) {
      if (Array.isArray(data)) return (await model.insertMany(data)).map((d) => d.toObject());
      return (await model.create(data)).toObject();
    },
    async find(query = {}, opts = {}) {
      let q = model.find(query);
      if (opts.sort) q = q.sort(opts.sort);
      if (opts.skip) q = q.skip(opts.skip);
      if (opts.limit) q = q.limit(opts.limit);
      return (await q.lean()).map((d) => ({ ...d, _id: String(d._id) }));
    },
    async findOne(query = {}) {
      const r = await model.findOne(query).lean();
      return r ? { ...r, _id: String(r._id) } : null;
    },
    async findById(id) {
      const r = await model.findById(id).lean();
      return r ? { ...r, _id: String(r._id) } : null;
    },
    async findByIdAndUpdate(id, update, opts = { new: true }) {
      const r = await model.findByIdAndUpdate(id, update, opts).lean();
      return r ? { ...r, _id: String(r._id) } : null;
    },
    async findOneAndUpdate(query, update, opts = { new: true, upsert: false }) {
      const r = await model.findOneAndUpdate(query, update, opts).lean();
      return r ? { ...r, _id: String(r._id) } : null;
    },
    async findByIdAndDelete(id) {
      const r = await model.findByIdAndDelete(id).lean();
      return r ? { ...r, _id: String(r._id) } : null;
    },
    async deleteOne(query = {}) {
      return await model.deleteOne(query);
    },
    async deleteMany(query = {}) {
      return await model.deleteMany(query);
    },
    async countDocuments(query = {}) {
      return await model.countDocuments(query);
    },
  };
}

function getDb() {
  if (isUsingMemory || !connected) {
    return memoryDb;
  }
  return {
    users: adaptModel(User),
    searchhistory: adaptModel(SearchHistory),
    favoritelocations: adaptModel(FavoriteLocation),
    alerts: adaptModel(Alert),
    weathersnapshots: adaptModel(WeatherSnapshot),
  };
}

module.exports = { connectDb, getDb, isUsingMemory: () => isUsingMemory || !connected };
