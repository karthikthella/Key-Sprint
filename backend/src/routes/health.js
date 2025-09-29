import { Router } from 'express';
const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'typeracer-clone/server',
    uptime: process.uptime()
  });
});

export default router;
