import { Router } from 'express';
import mongoose from 'mongoose';
import { roomManager } from '../socket/roomManager.js';

const router = Router();

const startTime = Date.now();

router.get('/', (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1
      ? 'connected'
      : mongoose.connection.readyState === 2
      ? 'connecting'
      : 'disconnected';

  const metrics = roomManager.getMetrics();
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null
    },
    rooms: metrics,
    memory: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    }
  });
});

export default router;
