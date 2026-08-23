import { Router } from 'express';
import RaceResult from '../models/RaceResult.js';
import User from '../models/User.js';

const router = Router();

/**
 * POST /api/races
 * Save a race result and atomically update user stats (if userId provided).
 * Body: { userId?, passageId?, wpm, accuracy, charsTyped?, durationMs, rank?, isWinner? }
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      passageId,
      wpm,
      accuracy,
      charsTyped = 0,
      durationMs,
      rank = 1,
      isWinner = false
    } = req.body;

    if (
      typeof wpm !== 'number' ||
      typeof accuracy !== 'number' ||
      typeof durationMs !== 'number' ||
      wpm < 0 ||
      accuracy < 0 ||
      accuracy > 100 ||
      durationMs < 0
    ) {
      return res.status(400).json({
        error: 'Valid wpm (0-400), accuracy (0-100), and durationMs (>=0) are required'
      });
    }

    const validWpm = Math.min(400, Math.round(wpm));
    const validAccuracy = Math.min(100, Math.round(accuracy));
    const validRank = Math.max(1, parseInt(rank, 10) || 1);
    const winnerFlag = Boolean(isWinner || validRank === 1);

    const race = new RaceResult({
      user: userId || null,
      passage: passageId || null,
      wpm: validWpm,
      accuracy: validAccuracy,
      charsTyped: Math.max(0, charsTyped),
      durationMs: Math.max(0, durationMs),
      rank: validRank,
      isWinner: winnerFlag
    });

    await race.save();

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        await user.updateStats({
          wpm: validWpm,
          accuracy: validAccuracy,
          durationMs,
          isWinner: winnerFlag
        });
      }
    }

    return res.status(201).json(race);
  } catch (err) {
    console.error('POST /api/races error:', err);
    return res.status(500).json({ error: 'Failed to record race result' });
  }
});

/**
 * GET /api/races/user/:userId
 * Returns recent race results for a given user with pagination
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId.trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const [total, races] = await Promise.all([
      RaceResult.countDocuments({ user: userId }),
      RaceResult.find({ user: userId })
        .populate('passage', 'text source universe difficulty length')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      data: races
    });
  } catch (error) {
    console.error('Error fetching user races:', error);
    return res.status(500).json({ error: 'Failed to fetch race history' });
  }
});

export default router;
