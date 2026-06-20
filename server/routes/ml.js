/** server/routes/ml.js — Random Forest prediction + metrics + retrain */
'use strict';
const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const { getModel, resetModel } = require('../lib/random-forest');
const { recommendationForPrediction } = require('../lib/recommendations');

const execFileAsync = promisify(execFile);

// Predict weather condition from 6 features using Random Forest
router.post('/predict', (req, res) => {
  try {
    const { temperature, humidity, windSpeed, pressure, cloudCover, visibility } = req.body || {};
    const features = [Number(temperature), Number(humidity), Number(windSpeed), Number(pressure), Number(cloudCover), Number(visibility)];
    if (features.some((f) => Number.isNaN(f))) {
      return res.status(400).json({ error: 'All 6 features must be valid numbers' });
    }
    const { model, metrics } = getModel();
    const prediction = model.predict(features);
    const probabilities = model.predictProba(features);
    const confidence = model.confidence(features);
    res.json({
      prediction,
      confidence: +confidence.toFixed(4),
      probabilities,
      recommendation: recommendationForPrediction(prediction, features),
      modelInfo: {
        nEstimators: metrics.nEstimators, maxDepth: metrics.maxDepth,
        trainedAt: metrics.trainedAt, trainingSamples: metrics.trainingSamples,
        accuracy: metrics.accuracy,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Prediction failed', detail: e.message });
  }
});

// Get model metrics (prefer Python script's metadata.json if available)
router.get('/metrics', async (req, res) => {
  try {
    const pyMetaPath = path.join(__dirname, '..', '..', 'scripts', 'model-metadata.json');
    try {
      const raw = await fs.promises.readFile(pyMetaPath, 'utf-8');
      const pyMeta = JSON.parse(raw);
      return res.json({ metrics: pyMeta, source: 'python-scikit-learn' });
    } catch {
      // fall through to JS metrics
    }
    const { metrics } = getModel();
    res.json({ metrics, source: 'js-port' });
  } catch (e) {
    res.status(500).json({ error: 'Metrics fetch failed', detail: e.message });
  }
});

// Retrain via Python script (scikit-learn + joblib)
router.post('/retrain', async (req, res) => {
  try {
    const overrides = req.body || {};
    const env = { ...process.env };
    if (overrides.nEstimators) env.WA_N_ESTIMATORS = String(overrides.nEstimators);
    if (overrides.maxDepth) env.WA_MAX_DEPTH = String(overrides.maxDepth);
    if (overrides.samples) env.WA_SAMPLES = String(overrides.samples);

    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'train_random_forest.py');
    const { stdout } = await execFileAsync('python3', [scriptPath], {
      cwd: path.join(__dirname, '..', '..'),
      env, timeout: 120000,
    });

    const pyMetaPath = path.join(__dirname, '..', '..', 'scripts', 'model-metadata.json');
    const raw = await fs.promises.readFile(pyMetaPath, 'utf-8');
    const metrics = JSON.parse(raw);
    resetModel(); // reset JS cache so /predict stays in sync
    res.json({ ok: true, metrics, source: 'python-scikit-learn', logs: stdout.slice(-2000) });
  } catch (e) {
    res.status(500).json({ error: 'Retrain failed', detail: e.message });
  }
});

module.exports = router;
