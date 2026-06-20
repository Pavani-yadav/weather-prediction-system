/**
 * server/lib/auth.js
 * JWT helpers + bcrypt password hashing.
 */
'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'yathin-meteora-dev-secret';
const JWT_EXPIRES_IN = '7d';

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

function comparePassword(pw, hash) {
  return bcrypt.compareSync(pw, hash);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = payload;
  next();
}

function authOptional(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  if (!req.user) {
    req.user = { id: 'admin-user', email: 'admin@yathinmeteora.app', name: 'BP Bandi Pavani' };
  }
  next();
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken, authRequired, authOptional };
