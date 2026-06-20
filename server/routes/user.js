/** server/routes/user.js — User profile + favorites + search history */
'use strict';
const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const { authOptional } = require('../lib/auth');
const { hashPassword } = require('../lib/auth');

// Get profile (auto-creates admin user on first call)
router.get('/profile', authOptional, async (req, res) => {
  try {
    const db = getDb();
    let u = await db.users.findOne({ email: 'admin@yathinmeteora.app' });
    if (!u) {
      u = await db.users.create({
        email: 'admin@yathinmeteora.app',
        passwordHash: hashPassword('meteora2026'),
        name: 'BP Bandi Pavani',
        bio: 'Admin & creator of Yathin Meteora — real-time ML-powered weather analytics platform.',
        avatar: '', role: 'user',
      });
    }
    const { passwordHash, __v, ...safe } = u;
    res.json({ user: safe });
  } catch (e) {
    res.status(500).json({ error: 'Profile fetch failed', detail: e.message });
  }
});

// Update profile
router.patch('/profile', authOptional, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body || {};
    const db = getDb();
    let u = await db.users.findOne({ email: 'admin@yathinmeteora.app' });
    if (!u) {
      u = await db.users.create({
        email: 'admin@yathinmeteora.app',
        passwordHash: hashPassword('meteora2026'),
        name: name || 'BP Bandi Pavani', bio: bio || '', avatar: avatar || '', role: 'user',
      });
    } else {
      u = await db.users.findByIdAndUpdate(u._id, {
        $set: {
          ...(name !== undefined && { name }),
          ...(bio !== undefined && { bio }),
          ...(avatar !== undefined && { avatar }),
        },
      });
    }
    const { passwordHash, __v, ...safe } = u;
    res.json({ user: safe });
  } catch (e) {
    res.status(500).json({ error: 'Profile update failed', detail: e.message });
  }
});

// Favorites
router.get('/favorites', authOptional, async (req, res) => {
  try {
    const db = getDb();
    const favorites = await db.favoritelocations.find({ userId: req.user?.id || 'admin-user' });
    res.json({ favorites });
  } catch (e) {
    res.status(500).json({ error: 'Favorites fetch failed', detail: e.message });
  }
});

router.post('/favorites', authOptional, async (req, res) => {
  try {
    const { city, country, lat, lon } = req.body || {};
    if (!city) return res.status(400).json({ error: 'city required' });
    const db = getDb();
    const fav = await db.favoritelocations.create({
      userId: req.user?.id || 'admin-user',
      city, country: country || '',
      lat: Number(lat) || 0, lon: Number(lon) || 0,
    });
    res.status(201).json({ favorite: fav });
  } catch (e) {
    res.status(500).json({ error: 'Favorite create failed', detail: e.message });
  }
});

router.delete('/favorites/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.favoritelocations.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Favorite delete failed', detail: e.message });
  }
});

// Search history
router.get('/history', authOptional, async (req, res) => {
  try {
    const db = getDb();
    const history = await db.searchhistory.find(
      { userId: req.user?.id || 'admin-user' },
      { sort: { createdAt: -1 }, limit: 50 }
    );
    res.json({ history });
  } catch (e) {
    res.status(500).json({ error: 'History fetch failed', detail: e.message });
  }
});

router.delete('/history', authOptional, async (req, res) => {
  try {
    const db = getDb();
    await db.searchhistory.deleteMany({ userId: req.user?.id || 'admin-user' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'History clear failed', detail: e.message });
  }
});

module.exports = router;
