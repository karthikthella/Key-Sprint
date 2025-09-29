// server/src/routes/users.js
import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

/**
 * POST /api/users
 * Create a simple user (username required).
 * This is intentionally minimal for now (no passwords).
 */
router.post('/', async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'username required' });
    }

    // Check if username is taken
    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(409).json({ error: 'username taken' });
    }

    // create new user document
    const user = new User({ username: username.trim(), email: email?.trim() || null });
    await user.save();

    // return the created user (lean and safe)
    return res.status(201).json(user);
  } catch (err) {
    console.error('POST /api/users error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/users/:id
 * Get user by id (includes stats)
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'user not found' });
    return res.json(user);
  } catch (err) {
    console.error('GET /api/users/:id error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

export default router;
