import { Router } from 'express';
import mongoose from 'mongoose';
import Passage from '../models/Passage.js';
import {
  CURATED_PASSAGES,
  getFallbackPassage,
  getFallbackUniverses
} from '../services/passageService.js';

const router = Router();

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * POST /api/passages
 * Create a new passage. Body: { text, source?, universe?, difficulty? }
 */
router.post('/', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        error: 'Database is not connected. Connect MongoDB to submit passages.'
      });
    }

    const { text, source, universe, difficulty } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return res.status(400).json({ error: 'Text is required and must be at least 10 characters long' });
    }

    const validDifficulty = ['easy', 'medium', 'hard'].includes(difficulty?.toLowerCase())
      ? difficulty.toLowerCase()
      : 'medium';

    const passage = new Passage({
      text: text.trim(),
      source: source?.trim() || 'User Submission',
      universe: universe?.trim()?.toLowerCase() || 'general',
      difficulty: validDifficulty
    });

    await passage.save();
    return res.status(201).json(passage);
  } catch (err) {
    console.error('POST /api/passages error:', err);
    return res.status(500).json({ error: 'Failed to create passage' });
  }
});

/**
 * GET /api/passages/universes
 * Returns distinct universe categories and their passage counts
 */
router.get('/universes', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json({ universes: getFallbackUniverses() });
    }

    const universeStats = await Passage.aggregate([
      {
        $group: {
          _id: '$universe',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    if (!universeStats || universeStats.length === 0) {
      return res.json({ universes: getFallbackUniverses() });
    }

    const universes = universeStats.map((u) => ({
      universe: u._id,
      count: u.count
    }));

    return res.json({ universes });
  } catch (err) {
    console.error('GET /api/passages/universes error:', err);
    return res.json({ universes: getFallbackUniverses() });
  }
});

/**
 * GET /api/passages
 * List passages with pagination and universe/difficulty filters
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const universe = req.query.universe ? req.query.universe.trim().toLowerCase() : null;
    const difficulty = req.query.difficulty ? req.query.difficulty.trim().toLowerCase() : null;

    if (!isDbConnected()) {
      let filtered = CURATED_PASSAGES;
      if (universe && universe !== 'all') {
        filtered = filtered.filter((p) => p.universe.toLowerCase() === universe);
      }
      if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
        filtered = filtered.filter((p) => p.difficulty.toLowerCase() === difficulty);
      }

      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      return res.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        data: paginated
      });
    }

    const query = {};
    if (universe && universe !== 'all') {
      query.universe = universe;
    }
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      query.difficulty = difficulty;
    }

    const [total, passages] = await Promise.all([
      Passage.countDocuments(query),
      Passage.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      data: passages
    });
  } catch (err) {
    console.error('GET /api/passages error:', err);
    return res.status(500).json({ error: 'Failed to retrieve passages' });
  }
});

/**
 * GET /api/passages/random?universe=tech&difficulty=medium
 * Returns one random passage matching criteria
 */
router.get('/random', async (req, res) => {
  try {
    const universe = req.query.universe?.trim();
    const difficulty = req.query.difficulty?.trim();
    const passage = await Passage.getRandom({ universe, difficulty });

    if (!passage) {
      return res.json(getFallbackPassage({ universe, difficulty }));
    }

    return res.json(passage);
  } catch (err) {
    console.error('GET /api/passages/random error:', err);
    return res.json(getFallbackPassage());
  }
});

export default router;
