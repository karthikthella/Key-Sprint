// server/src/routes/races.js
import { Router } from 'express';
import RaceResult from '../models/RaceResult.js';
import User from '../models/User.js';

const router = Router();

/**
 * POST /api/races
 * Save a race result and update user stats (if userId provided).
 * Body: { userId?, passageId?, wpm, accuracy, charsTyped?, durationMs }
 */
router.post('/', async (req, res) => {
  try {
    const { userId, passageId, wpm, accuracy, charsTyped = 0, durationMs } = req.body;

    // Basic validation
    if (typeof wpm !== 'number' || typeof accuracy !== 'number' || typeof durationMs !== 'number') {
      return res.status(400).json({ error: 'wpm, accuracy and durationMs are required as numbers' });
    }

    // Create race result
    const race = new RaceResult({
      user: userId || null,
      passage: passageId || null,
      wpm,
      accuracy,
      charsTyped,
      durationMs
    });

    await race.save();

    // If user provided, update their aggregated stats
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const oldCount = user.racesCount || 0;
        const newCount = oldCount + 1;

        // Update bestWPM
        user.bestWPM = Math.max(user.bestWPM || 0, wpm);

        // Update average (numerically stable running average)
        user.avgWPM = ((user.avgWPM || 0) * oldCount + wpm) / newCount;

        user.racesCount = newCount;
        await user.save();
      }
    }

    return res.status(201).json(race);
  } catch (err) {
    console.error('POST /api/races error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/races/user/:userId
 * Returns all races for a given user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId.trim();

    const races = await RaceResult.find({ user: userId })
      .populate('passage', 'text')
      .sort({ createdAt: -1 });

    res.json(races);
  } catch (error) {
    console.error('Error fetching user races:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
