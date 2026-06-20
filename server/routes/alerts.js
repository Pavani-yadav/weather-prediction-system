/** server/routes/alerts.js — CRUD for weather alerts */
'use strict';
const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const { authOptional } = require('../lib/auth');

router.get('/', authOptional, async (req, res) => {
  try {
    const db = getDb();
    const alerts = await db.alerts.find({}, { sort: { createdAt: -1 }, limit: 100 });
    res.json({ alerts });
  } catch (e) {
    res.status(500).json({ error: 'Alerts fetch failed', detail: e.message });
  }
});

router.post('/', authOptional, async (req, res) => {
  try {
    const { type, severity, title, message, region, expiresAt } = req.body || {};
    if (!type || !severity || !title || !expiresAt) {
      return res.status(400).json({ error: 'type, severity, title, expiresAt required' });
    }
    const db = getDb();
    const alert = await db.alerts.create({
      userId: req.user?.id || 'admin-user',
      type, severity, title, message: message || '',
      region: region || '', expiresAt: new Date(expiresAt),
    });
    res.status(201).json({ alert });
  } catch (e) {
    res.status(500).json({ error: 'Alert create failed', detail: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const alert = await db.alerts.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Alert delete failed', detail: e.message });
  }
});

module.exports = router;
