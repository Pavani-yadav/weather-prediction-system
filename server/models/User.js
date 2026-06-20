/** server/models/User.js — Mongoose schema for User accounts */
'use strict';
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, default: 'user' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
