import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { JWT_SECRET, JWT_EXP } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, avatar: user.avatar || 'default' },
    JWT_SECRET,
    { expiresIn: JWT_EXP }
  );
}

function formatUserResponse(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar || 'default',
    avgWPM: user.avgWPM || 0,
    bestWPM: user.bestWPM || 0,
    racesCount: user.racesCount || 0,
    racesWon: user.racesWon || 0,
    avgAccuracy: user.avgAccuracy || 100,
    totalTimePlayedMs: user.totalTimePlayedMs || 0,
    createdAt: user.createdAt
  };
}

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        error: 'Database is not connected. Please verify MongoDB status.'
      });
    }

    const { username, email, password, avatar = 'default' } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters long' });
    }

    if (username.trim().length > 30) {
      return res.status(400).json({ error: 'Username must not exceed 30 characters' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

    // Check duplicate username (case-insensitive)
    const existing = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = new User({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      avatar: String(avatar).slice(0, 50)
    });

    await user.save();
    const token = makeToken(user);

    return res.status(201).json({
      user: formatUserResponse(user),
      token
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        error: 'Database is not connected. Please verify MongoDB status.'
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = makeToken(user);

    return res.json({
      user: formatUserResponse(user),
      token
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: formatUserResponse(user) });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return res.status(500).json({ error: 'Failed to fetch current user profile' });
  }
});

export default router;
