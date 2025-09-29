// server/src/routes/passages.js
import { Router } from 'express';
import Passage from '../models/Passage.js';

const router = Router();

/**
 * POST /api/passages
 * Create a new passage. Body: { text, source?, universe? }
 */
router.post('/', async (req, res) => {
  try {
    const { text, source, universe } = req.body;
    if (!text || text.trim().length === 0) return res.status(400).json({ error: 'text required' });

    const passage = new Passage({
      text: text.trim(),
      source: source?.trim() || 'user-submission',
      universe: universe?.trim() || 'general'
    });

    await passage.save();
    return res.status(201).json(passage);
  } catch (err) {
    console.error('POST /api/passages error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/passages
 * List passages (paged): ?page=1&limit=20
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const docs = await Passage.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return res.json({ page, limit, data: docs });
  } catch (err) {
    console.error('GET /api/passages error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/passages/random?universe=general
 * Return one random passage (optionally filtered by universe).
 *
 * Implementation detail:
 * - We use countDocuments + skip(random) to pick a single document randomly.
 * - This is a simple approach that works fine for moderate collections.
 */
router.get('/random', async (req, res) => {
  try {
    const universe = req.query.universe;
    const filter = universe ? { universe } : {};
    const count = await Passage.countDocuments(filter);
    if (count === 0) return res.status(404).json({ error: 'no passages found' });
    const rand = Math.floor(Math.random() * count);
    const doc = await Passage.findOne(filter).skip(rand).lean();
    return res.json(doc);
  } catch (err) {
    console.error('GET /api/passages/random error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

export default router;
