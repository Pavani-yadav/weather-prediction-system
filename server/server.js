/**
 * server/server.js
 *
 * Yathin Meteora — Real-Time Weather Prediction Platform
 * Backend: Node.js + Express + MongoDB (Mongoose) + JWT
 *
 * Tech stack (per spec):
 *   - HTML, CSS, JavaScript (vanilla, no React/Next.js)
 *   - Node.js + Express.js (this file)
 *   - MongoDB (Mongoose) — falls back to in-memory store if MONGODB_URI unset
 *   - Python scikit-learn + joblib Random Forest Classifier (called via /api/predict)
 *
 * Serves:
 *   - Static frontend from /public on http://localhost:3000
 *   - REST API on http://localhost:3000/api/*
 */
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execFileAsync = promisify(execFile);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ----------------------------- DB Connection -----------------------------
const { connectDb, getDb } = require('./lib/db');

// ----------------------------- Routes -----------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/forecast', require('./routes/forecast'));
app.use('/api/history', require('./routes/history'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/ml', require('./routes/ml'));
app.use('/api/user', require('./routes/user'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'yathin-meteora', version: '1.0.0', ts: new Date().toISOString() });
});

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[server] error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ----------------------------- Boot -----------------------------
async function boot() {
  await connectDb();
  app.listen(PORT, () => {
    console.log('=================================================');
    console.log('  Yathin Meteora — Real-Time Weather Prediction');
    console.log('=================================================');
    console.log(`  Server:     http://localhost:${PORT}`);
    console.log(`  API:        http://localhost:${PORT}/api/health`);
    console.log(`  MongoDB:    ${process.env.MONGODB_URI ? 'connected' : 'in-memory fallback'}`);
    console.log(`  Admin user: admin@yathinmeteora.app / meteora2026`);
    console.log('=================================================');
    console.log('  Press Ctrl+C to stop');
  });
}

boot().catch((e) => {
  console.error('Boot failed:', e);
  process.exit(1);
});
