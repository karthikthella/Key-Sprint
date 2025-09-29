// server/src/index.js
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

// config
import { CLIENT_ORIGIN, PORT, JWT_SECRET } from './config/env.js';
import { connectMongo } from './config/db.js';

// models
import User from './models/User.js';
import RaceResult from './models/RaceResult.js';

// routes
import healthRouter from './routes/health.js';
import usersRouter from './routes/users.js';
import passagesRouter from './routes/passages.js';
import racesRouter from './routes/races.js';
import authRouter from './routes/auth.js'; // NEW

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// REST routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);    // NEW
app.use('/api/users', usersRouter);
app.use('/api/passages', passagesRouter);
app.use('/api/races', racesRouter);

// generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'internal server error' });
});

const server = http.createServer(app);


const io = new SocketServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- AUTH MIDDLEWARE FOR SOCKETS ---
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow anon users too
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = { id: payload.id, username: payload.username };
    return next();
  } catch (err) {
    console.warn('Socket auth failed:', err.message);
    return next(); // continue as anonymous
  }
});


// In-memory race storage
const races = {};

// Helper: leaderboard
function buildLeaderboard(room) {
  const players = Object.values(room.players || {});
  players.sort((a, b) => {
    const aPerfect = a.progress >= 100 && a.accuracy === 100;
    const bPerfect = b.progress >= 100 && b.accuracy === 100;
    if (aPerfect && !bPerfect) return -1;
    if (!aPerfect && bPerfect) return 1;
    if (aPerfect && bPerfect) return (a.finishTime || 0) - (b.finishTime || 0);
    if (b.progress !== a.progress) return b.progress - a.progress;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return (b.wpm || 0) - (a.wpm || 0);
  });
  return players.map(p => ({
    socketId: p.socketId,
    userId: p.userId,
    username: p.username,
    progress: p.progress,
    wpm: p.wpm,
    accuracy: p.accuracy,
    finished: p.finished,
    finishTime: p.finishTime || null
  }));
}

function broadcastLeaderboard(roomId) {
  const room = races[roomId];
  if (!room) return;
  const lb = buildLeaderboard(room);
  io.to(roomId).emit('race:leaderboard', { leaderboard: lb });
}

async function persistRaceResultIfUser(room, player) {
  try {
    if (!player.userId || player.saved) return;

    const durationMs = (player.finishTime && room.startedAt)
      ? Math.max(0, player.finishTime - room.startedAt)
      : 0;
    const charsTyped = room.passageText ? room.passageText.length : 0;

    const rr = new RaceResult({
      user: player.userId,
      passage: room.passageId || null,
      wpm: player.wpm || 0,
      accuracy: player.accuracy ?? 100,
      charsTyped,
      durationMs
    });

    await rr.save();

    // update stats
    const user = await User.findById(player.userId);
    if (user) {
      const oldCount = user.racesCount || 0;
      const newCount = oldCount + 1;
      user.bestWPM = Math.max(user.bestWPM || 0, rr.wpm);
      user.avgWPM = ((user.avgWPM || 0) * oldCount + rr.wpm) / newCount;
      user.racesCount = newCount;
      await user.save();
    }

    player.saved = true;
  } catch (err) {
    console.error('persistRaceResult error', err);
  }
}


io.on('connection', (socket) => {
  console.log(`🔌 socket connected: ${socket.id}`);

  // --- CREATE ROOM ---
  socket.on('room:create', async (payload, ack) => {
    try {
      const { universe = null } = payload || {};
      const roomId = Math.floor(100000 + Math.random() * 900000).toString();

      const Passage = (await import('./models/Passage.js')).default;
      const count = await Passage.countDocuments(universe ? { universe } : {});
      const passageDoc =
        count > 0
          ? await Passage.findOne(universe ? { universe } : {})
              .skip(Math.floor(Math.random() * count))
              .lean()
          : null;

      const userIdToUse = socket.user?.id || payload?.userId || null;
      const usernameToUse = socket.user?.username || payload?.username || 'Anonymous';

      const room = {
        id: roomId,
        passageId: passageDoc?._id || null,
        passageText: passageDoc?.text || 'No passage available.',
        hostSocketId: socket.id,
        players: {},
        startedAt: null,
        status: 'waiting',
        winnerSocketId: null,
      };

      room.players[socket.id] = {
        socketId: socket.id,
        userId: userIdToUse,
        username: usernameToUse,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishTime: null,
      };

      races[roomId] = room;
      socket.join(roomId);

      ack && ack({ ok: true, roomId, room });
      io.to(roomId).emit('room:state', {
        room: { id: roomId, status: room.status, players: buildLeaderboard(room) },
      });
    } catch (err) {
      console.error('room:create error', err);
      ack && ack({ ok: false, error: 'create_failed' });
    }
  });

  // --- JOIN ROOM ---
  socket.on('room:join', (payload, ack) => {
    try {
      const { roomId } = payload || {};
      const room = races[roomId];
      if (!room) return ack && ack({ ok: false, error: 'room_not_found' });
      if (room.status === 'finished') return ack && ack({ ok: false, error: 'race_finished' });

      const userIdToUse = socket.user?.id || payload?.userId || null;
      const usernameToUse = socket.user?.username || payload?.username || 'Anonymous';

      room.players[socket.id] = {
        socketId: socket.id,
        userId: userIdToUse,
        username: usernameToUse,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishTime: null,
      };

      socket.join(roomId);

      ack && ack({
        ok: true,
        room: {
          id: roomId,
          passageId: room.passageId,
          passageText: room.passageText,
          status: room.status,
          players: buildLeaderboard(room),
        },
      });

      io.to(roomId).emit('room:playerJoined', {
        player: room.players[socket.id],
        players: buildLeaderboard(room),
      });
    } catch (err) {
      console.error('room:join error', err);
      ack && ack({ ok: false, error: 'join_failed' });
    }
  });

  // --- CREATE BOT ROOM ---
  socket.on('room:createBotRoom', async (payload, ack) => {
    const username = payload?.username || 'Player';
    const botCount = payload?.botCount || 1;
    const roomId = Math.random().toString(36).slice(2, 8);

    const Passage = (await import('./models/Passage.js')).default;
    const count = await Passage.countDocuments({});
    const passageDoc =
      count > 0
        ? await Passage.findOne().skip(Math.floor(Math.random() * count)).lean()
        : null;

    const room = {
      id: roomId,
      passageId: passageDoc?._id || null,
      passageText: passageDoc?.text || 'No passage available.',
      hostSocketId: socket.id,
      players: {},
      startedAt: null,
      status: 'waiting',
      winnerSocketId: null,
    };

    // add human player
    room.players[socket.id] = {
      socketId: socket.id,
      userId: socket.user?.id || null,
      username,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      finishTime: null,
    };

    // add bots
    for (let i = 1; i <= botCount; i++) {
      room.players[`bot${i}`] = {
        socketId: `bot${i}`,
        userId: null,
        username: `Bot ${i}`,
        progress: 0,
        wpm: 20 + Math.floor(Math.random() * 80), // 20-100 WPM
        accuracy: 95 + Math.floor(Math.random() * 5),
        finished: false,
        finishTime: null,
      };
    }

    races[roomId] = room;
    socket.join(roomId);

    // auto-start race
    startRaceWithBots(roomId);

    ack && ack({ ok: true, roomId, room });
  });

  // --- START RACE ---
  socket.on('race:start', ({ roomId, countdownSec = 3 }, ack) => {
    const room = races[roomId];
    if (!room) return ack && ack({ ok: false, error: 'room_not_found' });

    room.status = 'countdown';
    const startAt = Date.now() + countdownSec * 1000;
    room.startedAt = startAt;

    io.to(roomId).emit('race:countdown', { startAt, countdownSec });

    setTimeout(() => {
      const r = races[roomId];
      if (!r) return;
      r.status = 'running';
      io.to(roomId).emit('race:started', {
        startedAt: r.startedAt,
        passageText: r.passageText,
      });
      broadcastLeaderboard(roomId);
    }, countdownSec * 1000);

    ack && ack({ ok: true, startAt });
  });

  // --- PROGRESS ---
  socket.on('race:progress', async ({ roomId, progress = 0, wpm = 0, accuracy = 100 }) => {
    const room = races[roomId];
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    player.progress = Math.min(100, Math.max(0, progress));
    player.wpm = wpm;
    player.accuracy = accuracy;

    if (player.progress >= 100 && !player.finished) {
      player.finished = true;
      player.finishTime = Date.now();
      await persistRaceResultIfUser(room, player);
    }

    broadcastLeaderboard(roomId);

    const unfinished = Object.values(room.players).filter(p => !p.finished);
    if (unfinished.length === 0 && room.status !== 'finished') {
      room.status = 'finished';
      const finalLd = buildLeaderboard(room);
      const winner = finalLd[0];
      io.to(roomId).emit('race:finished', { finalLeaderboard: finalLd, winner });
    }
  });

  // --- FINISH ---
  socket.on('race:finish', async ({ roomId }) => {
    const room = races[roomId];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    if (!player.finished) {
      player.finished = true;
      player.finishTime = Date.now();
    }
    if (!room.winnerSocketId) room.winnerSocketId = socket.id;

    await persistRaceResultIfUser(room, player);

    broadcastLeaderboard(roomId);

    const unfinished = Object.values(room.players).filter(p => !p.finished);
    if (unfinished.length === 0 && room.status !== 'finished') {
      room.status = 'finished';
      const finalLd = buildLeaderboard(room);
      const winner = finalLd[0];
      io.to(roomId).emit('race:finished', { finalLeaderboard: finalLd, winner });
    }
  });

  // --- LEAVE ROOM ---
  socket.on('room:leave', ({ roomId }) => {
    const room = races[roomId];
    if (!room) return;

    delete room.players[socket.id];
    socket.leave(roomId);
    io.to(roomId).emit('room:playerLeft', {
      socketId: socket.id,
      players: buildLeaderboard(room),
    });

    if (Object.keys(room.players).length === 0) {
      delete races[roomId];
      console.log(`room ${roomId} deleted (empty)`);
    } else if (room.hostSocketId === socket.id) {
      room.hostSocketId = Object.keys(room.players)[0];
      io.to(roomId).emit('room:newHost', { hostSocketId: room.hostSocketId });
    }
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    Object.keys(races).forEach(roomId => {
      const room = races[roomId];
      if (!room?.players[socket.id]) return;

      delete room.players[socket.id];
      io.to(roomId).emit('room:playerLeft', {
        socketId: socket.id,
        players: buildLeaderboard(room),
      });

      if (Object.keys(room.players).length === 0) {
        delete races[roomId];
        console.log(`room ${roomId} deleted (empty after disconnect)`);
      } else if (room.hostSocketId === socket.id) {
        room.hostSocketId = Object.keys(room.players)[0];
        io.to(roomId).emit('room:newHost', { hostSocketId: room.hostSocketId });
      }
    });
  });
});

// --- BOT SIMULATION ---
function startRaceWithBots(roomId) {
  const room = races[roomId];
  if (!room) return;
  room.status = 'running';
  io.to(roomId).emit('race:started', { startedAt: Date.now(), passageText: room.passageText });

  Object.values(room.players).forEach(player => {
    if (player.socketId.startsWith('bot')) {
      const interval = setInterval(async () => {
        if (player.finished) return clearInterval(interval);

        const increment = Math.random() * 5; // progress increment
        player.progress = Math.min(100, player.progress + increment);

        if (player.progress >= 100) {
          player.finished = true;
          player.finishTime = Date.now();
          await persistRaceResultIfUser(room, player);
          clearInterval(interval);
        }

        broadcastLeaderboard(roomId);

        const unfinished = Object.values(room.players).filter(p => !p.finished);
        if (unfinished.length === 0 && room.status !== 'finished') {
          room.status = 'finished';
          const finalLd = buildLeaderboard(room);
          const winner = finalLd[0];
          io.to(roomId).emit('race:finished', { finalLeaderboard: finalLd, winner });
        }
      }, 1000);
    }
  });
}



(async () => {
  await connectMongo();
  server.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
  });
})();
