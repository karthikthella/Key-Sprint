import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { roomManager } from './roomManager.js';

export function setupRaceSocket(io) {
  // --- SOCKET AUTHENTICATION MIDDLEWARE ---
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow guest / anonymous users
        return next();
      }

      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.id && payload?.username) {
        socket.user = {
          id: payload.id,
          username: payload.username,
          avatar: payload.avatar || 'default'
        };
      }
      return next();
    } catch (err) {
      console.warn(`⚠️ Socket auth fallback (guest mode) for socket ${socket.id}: ${err.message}`);
      return next();
    }
  });

  // --- CONNECTION EVENT ---
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id} (User: ${socket.user?.username || 'Guest'})`);

    // 1. CREATE ROOM
    socket.on('room:create', async (payload, ack) => {
      try {
        const { universe, difficulty } = payload || {};
        const room = await roomManager.createRoom({
          hostSocketId: socket.id,
          user: socket.user || { username: payload?.username || 'Host' },
          universe,
          difficulty,
          isBotRoom: false
        });

        socket.join(room.id);

        const clientRoom = {
          id: room.id,
          passageId: room.passageId,
          passageText: room.passageText,
          source: room.source,
          universe: room.universe,
          difficulty: room.difficulty,
          status: room.status,
          hostSocketId: room.hostSocketId,
          isBotRoom: room.isBotRoom,
          players: roomManager.buildLeaderboard(room)
        };

        ack && ack({ ok: true, roomId: room.id, room: clientRoom });

        io.to(room.id).emit('room:state', {
          room: clientRoom
        });
      } catch (err) {
        console.error('room:create error:', err);
        ack && ack({ ok: false, error: 'Failed to create room' });
      }
    });

    // 2. JOIN ROOM
    socket.on('room:join', (payload, ack) => {
      try {
        const { roomId } = payload || {};
        if (!roomId) return ack && ack({ ok: false, error: 'Room ID is required' });

        const user = socket.user || { username: payload?.username };
        const result = roomManager.joinRoom(roomId, socket.id, user, io);

        if (!result.ok) {
          return ack && ack({ ok: false, error: result.error });
        }

        const room = result.room;
        socket.join(room.id);

        ack &&
          ack({
            ok: true,
            room: {
              id: room.id,
              passageId: room.passageId,
              passageText: room.passageText,
              source: room.source,
              universe: room.universe,
              difficulty: room.difficulty,
              status: room.status,
              hostSocketId: room.hostSocketId,
              players: roomManager.buildLeaderboard(room)
            }
          });

        io.to(room.id).emit('room:playerJoined', {
          player: room.players[socket.id],
          players: roomManager.buildLeaderboard(room)
        });
      } catch (err) {
        console.error('room:join error:', err);
        ack && ack({ ok: false, error: 'Failed to join room' });
      }
    });

    // 3. QUICK MATCH (Instant Matchmaking Queue)
    socket.on('room:quickMatch', async (payload, ack) => {
      try {
        const { universe, difficulty } = payload || {};
        const user = socket.user || { username: payload?.username || 'Racer' };

        const result = await roomManager.quickMatch(socket.id, user, { universe, difficulty }, io);
        socket.join(result.roomId);

        ack &&
          ack({
            ok: true,
            roomId: result.roomId,
            createdNew: result.createdNew,
            room: {
              id: result.room.id,
              passageText: result.room.passageText,
              source: result.room.source,
              universe: result.room.universe,
              status: result.room.status,
              hostSocketId: result.room.hostSocketId,
              players: roomManager.buildLeaderboard(result.room)
            }
          });

        io.to(result.roomId).emit('room:playerJoined', {
          player: result.room.players[socket.id],
          players: roomManager.buildLeaderboard(result.room)
        });
      } catch (err) {
        console.error('room:quickMatch error:', err);
        ack && ack({ ok: false, error: 'Matchmaking failed' });
      }
    });

    // 4. CREATE BOT ROOM (Solo Practice Mode)
    socket.on('room:createBotRoom', async (payload, ack) => {
      try {
        const { botCount = 3, universe, difficulty } = payload || {};
        const user = socket.user || { username: payload?.username || 'Player' };

        const room = await roomManager.createRoom({
          hostSocketId: socket.id,
          user,
          universe,
          difficulty,
          isBotRoom: true,
          botCount
        });

        socket.join(room.id);

        const clientRoom = {
          id: room.id,
          passageId: room.passageId,
          passageText: room.passageText,
          source: room.source,
          universe: room.universe,
          difficulty: room.difficulty,
          status: room.status,
          hostSocketId: room.hostSocketId,
          isBotRoom: true,
          players: roomManager.buildLeaderboard(room)
        };

        ack && ack({ ok: true, roomId: room.id, room: clientRoom });

        io.to(room.id).emit('room:state', {
          room: clientRoom
        });
      } catch (err) {
        console.error('room:createBotRoom error:', err);
        ack && ack({ ok: false, error: 'Failed to create bot room' });
      }
    });

    // 5. START RACE
    socket.on('race:start', ({ roomId, countdownSec = 3 }, ack) => {
      try {
        const result = roomManager.startRaceCountdown(roomId, socket.id, countdownSec, io);
        if (!result.ok) {
          return ack && ack({ ok: false, error: result.error });
        }
        ack && ack({ ok: true, startAt: result.startAt });
      } catch (err) {
        console.error('race:start error:', err);
        ack && ack({ ok: false, error: 'Failed to start race' });
      }
    });

    // 6. UPDATE PROGRESS
    socket.on('race:progress', async ({ roomId, progress = 0, wpm = 0, accuracy = 100 }) => {
      try {
        await roomManager.updatePlayerProgress(roomId, socket.id, { progress, wpm, accuracy }, io);
      } catch (err) {
        console.error('race:progress error:', err);
      }
    });

    // 7. FINISH RACE
    socket.on('race:finish', async ({ roomId }) => {
      try {
        await roomManager.finishPlayer(roomId, socket.id, io);
      } catch (err) {
        console.error('race:finish error:', err);
      }
    });

    // 8. REMATCH / PLAY AGAIN
    socket.on('race:rematch', async ({ roomId }, ack) => {
      try {
        const result = await roomManager.requestRematch(roomId, socket.id, io);
        if (!result.ok) {
          return ack && ack({ ok: false, error: result.error });
        }
        ack && ack({ ok: true, room: result.room });
      } catch (err) {
        console.error('race:rematch error:', err);
        ack && ack({ ok: false, error: 'Failed to request rematch' });
      }
    });

    // 9. IN-GAME SOCIAL: REACTIONS & CHAT
    socket.on('room:reaction', ({ roomId, emoji }) => {
      try {
        roomManager.sendReaction(roomId, socket.id, emoji, io);
      } catch (err) {
        console.error('room:reaction error:', err);
      }
    });

    socket.on('room:chat', ({ roomId, message }) => {
      try {
        roomManager.sendChat(roomId, socket.id, message, io);
      } catch (err) {
        console.error('room:chat error:', err);
      }
    });

    // 10. LEAVE ROOM
    socket.on('room:leave', ({ roomId }) => {
      try {
        socket.leave(roomId);
        roomManager.handlePlayerExit(socket.id, io, roomId);
      } catch (err) {
        console.error('room:leave error:', err);
      }
    });

    // 11. DISCONNECT
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      roomManager.handlePlayerExit(socket.id, io);
    });
  });
}
