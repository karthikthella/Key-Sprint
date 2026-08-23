import { Router } from 'express';
import User from '../models/User.js';
import RaceResult from '../models/RaceResult.js';

const router = Router();

/**
 * GET /api/users/leaderboard/top
 * Returns top users ranked by highest bestWPM, avgWPM, or racesWon
 * Query params: ?category=bestWPM|avgWPM|racesWon&limit=20
 */
router.get('/leaderboard/top', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const category = req.query.category || 'bestWPM';

    let sortCriteria = { bestWPM: -1, avgWPM: -1 };
    if (category === 'avgWPM') {
      sortCriteria = { avgWPM: -1, bestWPM: -1 };
    } else if (category === 'racesWon') {
      sortCriteria = { racesWon: -1, bestWPM: -1 };
    }

    const topUsers = await User.find({ racesCount: { $gt: 0 } })
      .sort(sortCriteria)
      .limit(limit)
      .select('username avatar bestWPM avgWPM racesCount racesWon avgAccuracy createdAt')
      .lean();

    return res.json({ category, leaderboard: topUsers });
  } catch (err) {
    console.error('GET /api/users/leaderboard/top error:', err);
    return res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
});

import { buildTelemetryAnalytics } from '../services/superlicenceService.js';

/**
 * GET /api/users/:id/stats
 * Detailed statistics breakdown, FIA superlicence tier, badges, and recent telemetry
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const payload = await buildTelemetryAnalytics(userId, user);
    return res.json(payload);
  } catch (err) {
    console.error('GET /api/users/:id/stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user statistics' });
  }
});

import { requireAuth } from '../middleware/auth.js';

/**
 * PATCH /api/users/profile
 * Update user avatar / constructor team livery
 */
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { ...(avatar && { avatar }) },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    return res.json({
      ok: true,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        avgWPM: updatedUser.avgWPM || 0,
        bestWPM: updatedUser.bestWPM || 0,
        racesCount: updatedUser.racesCount || 0,
        racesWon: updatedUser.racesWon || 0,
        avgAccuracy: updatedUser.avgAccuracy || 100,
        totalTimePlayedMs: updatedUser.totalTimePlayedMs || 0,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (err) {
    console.error('PATCH /api/users/profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
