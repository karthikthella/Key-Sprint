// server/src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET, JWT_EXP } from '../config/env.js';

const router = Router();

function makeToken(user) {
  return jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: JWT_EXP });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const existing = await User.findOne({ username: username.trim() });
    if (existing) return res.status(409).json({ error: 'username taken' });

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = new User({
      username: username.trim(),
      email: email?.trim() || null,
      passwordHash
    });

    await user.save();
    const token = makeToken(user);
    return res.status(201).json({ user: { id: user._id, username: user.username, email: user.email }, token });
  } catch (err) {
    console.error('POST /api/auth/register error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const user = await User.findOne({ username: username.trim() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = makeToken(user);
    return res.json({ user: { id: user._id, username: user.username }, token });
  } catch (err) {
    console.error('POST /api/auth/login error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

export default router;
