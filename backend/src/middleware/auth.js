// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'no token' });
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'invalid auth header' });
    const token = parts[1];
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) return res.status(401).json({ error: 'invalid token' });

    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(401).json({ error: 'user not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('auth middleware error', err);
    return res.status(401).json({ error: 'invalid token' });
  }
}
