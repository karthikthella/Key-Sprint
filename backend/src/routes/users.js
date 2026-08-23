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

/**
 * GET /api/users/:id/stats
 * Detailed statistics breakdown and recent race performance for a user
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .select('username avatar bestWPM avgWPM racesCount racesWon avgAccuracy totalTimePlayedMs createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch last 10 races for performance graph / trend
    const recentRaces = await RaceResult.find({ user: userId })
      .populate('passage', 'source universe difficulty')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const winRate = user.racesCount > 0 ? Math.round((user.racesWon / user.racesCount) * 100) : 0;

    return res.json({
      user,
      stats: {
        totalRaces: user.racesCount,
        racesWon: user.racesWon,
        winRatePercent: winRate,
        bestWPM: user.bestWPM,
        avgWPM: user.avgWPM,
        avgAccuracy: user.avgAccuracy,
        totalTimePlayedSec: Math.round((user.totalTimePlayedMs || 0) / 1000)
      },
      recentRaces
    });
  } catch (err) {
    console.error('GET /api/users/:id/stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user statistics' });
  }
});

/**
 * PATCH /api/users/profile
 * Update user avatar / constructor team livery
 */
router.patch('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Auth token required' });

    const token = authHeader.split(' ')[1];
    const jwt = (await import('jsonwebtoken')).default;
    const { JWT_SECRET } = await import('../config/env.js');
    const payload = jwt.verify(token, JWT_SECRET);

    const { avatar } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      payload.id,
      { ...(avatar && { avatar }) },
      { new: true }
    ).select('username avatar bestWPM avgWPM racesCount racesWon avgAccuracy totalTimePlayedMs createdAt');

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, user: updatedUser });
  } catch (err) {
    console.error('PATCH /api/users/profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
