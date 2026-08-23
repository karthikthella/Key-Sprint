/**
 * In-memory sliding window rate limiter
 * Protects endpoints from brute-force attacks and abuse.
 */
export function createRateLimiter({ windowMs = 60 * 1000, max = 30, message = 'Too many requests, please try again later.' }) {
  const requests = new Map();

  // Periodic cleanup of stale IP entries every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < windowMs);
      if (validTimestamps.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, validTimestamps);
      }
    }
  }, 2 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref(); // Don't block Node process exit
  }

  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const timestamps = requests.get(key) || [];

    // Filter out requests older than windowMs
    const windowStart = now - windowMs;
    const currentWindowRequests = timestamps.filter((t) => t > windowStart);

    if (currentWindowRequests.length >= max) {
      const oldestRequest = currentWindowRequests[0];
      const retryAfterSec = Math.ceil((oldestRequest + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({ error: message, retryAfterSec });
    }

    currentWindowRequests.push(now);
    requests.set(key, currentWindowRequests);
    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // 25 attempts per 15 min per IP
  message: 'Too many authentication attempts. Please try again after a few minutes.'
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: 'Rate limit exceeded. Please slow down.'
});
