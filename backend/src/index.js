import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

// Config
import { PORT, CLIENT_ORIGIN } from './config/env.js';
import { connectMongo, disconnectMongo } from './config/db.js';

// Middlewares
import { apiRateLimiter } from './middleware/rateLimiter.js';

// Sockets
import { setupRaceSocket } from './socket/raceSocket.js';
import { roomManager } from './socket/roomManager.js';

// Routes
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import passagesRouter from './routes/passages.js';
import racesRouter from './routes/races.js';

const app = express();

// CORS configuration supporting web clients, dev servers, and local tests
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, native apps, background tests)
    if (!origin) return callback(null, true);
    if (
      origin === CLIENT_ORIGIN ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', apiRateLimiter);

// REST API Endpoints
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/passages', passagesRouter);
app.use('/api/races', racesRouter);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);

// Socket.IO Server initialization
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Socket.IO game loops and handlers
setupRaceSocket(io);

// Server startup & Database initialization
(async () => {
  await connectMongo();

  server.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 Key-Sprint Server is running on port: ${PORT}`);
    console.log(`🩺 Health API:   http://localhost:${PORT}/api/health`);
    console.log(`🌐 Client Origin: ${CLIENT_ORIGIN}`);
    console.log(`==============================================\n`);
  });
})();

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down Key-Sprint server...`);

  // Clear all running room timers and intervals
  for (const roomId of roomManager.races.keys()) {
    roomManager.deleteRoom(roomId);
  }

  io.close(() => {
    console.log('🔌 Closed all Socket.IO connections');
  });

  server.close(async () => {
    console.log('🚪 HTTP Server closed');
    await disconnectMongo();
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
