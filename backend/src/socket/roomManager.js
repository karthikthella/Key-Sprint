import Passage from '../models/Passage.js';
import RaceResult from '../models/RaceResult.js';
import User from '../models/User.js';
import { sanitizeProgressInput } from '../services/antiCheat.js';

const MAX_PLAYERS_PER_ROOM = 4;
const ROOM_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL for abandoned rooms
const MAX_RACE_DURATION_MS = 180 * 1000; // 3 minutes max duration for a race before auto-concluding
const DEFAULT_PASSAGE_TEXT =
  "The quick brown fox jumps over the lazy dog. Programming is the art of telling another human being what one wants the computer to do.";

export class RoomManager {
  constructor() {
    this.races = new Map(); // roomId -> Room
    this.roomTimers = new Map(); // roomId -> Set<TimerId>
    this.socketToRoom = new Map(); // socketId -> roomId
  }

  // --- TIMER MANAGEMENT ---
  registerTimer(roomId, timerId) {
    if (!this.roomTimers.has(roomId)) {
      this.roomTimers.set(roomId, new Set());
    }
    this.roomTimers.get(roomId).add(timerId);
  }

  clearRoomTimers(roomId) {
    const timers = this.roomTimers.get(roomId);
    if (timers) {
      timers.forEach((t) => {
        clearInterval(t);
        clearTimeout(t);
      });
      this.roomTimers.delete(roomId);
    }
  }

  deleteRoom(roomId) {
    this.clearRoomTimers(roomId);
    const room = this.races.get(roomId);
    if (room) {
      Object.keys(room.players || {}).forEach((sId) => {
        this.socketToRoom.delete(sId);
      });
    }
    this.races.delete(roomId);
    console.log(`🧹 Room [${roomId}] cleanly deleted.`);
  }

  // --- LEADERBOARD BUILDER ---
  buildLeaderboard(room) {
    if (!room || !room.players) return [];
    const players = Object.values(room.players);

    players.sort((a, b) => {
      // 1. Finished players come first, sorted by finish time
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) {
        return (a.finishTime || 0) - (b.finishTime || 0);
      }
      // 2. Higher progress first
      if (b.progress !== a.progress) return b.progress - a.progress;
      // 3. Higher accuracy next
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      // 4. Higher WPM next
      return (b.wpm || 0) - (a.wpm || 0);
    });

    const winnerFinishTime = players.find((p) => p.finished)?.finishTime || null;

    return players.map((p, idx) => {
      let lapTimeStr = '--';
      let deltaStr = '--';

      if (p.finished && room.startedAt && p.finishTime) {
        const elapsedSec = Math.max(0.1, (p.finishTime - room.startedAt) / 1000);
        lapTimeStr = `${elapsedSec.toFixed(2)}s`;

        if (idx === 0) {
          deltaStr = 'LEADER';
        } else if (winnerFinishTime) {
          const gap = Math.max(0, (p.finishTime - winnerFinishTime) / 1000);
          deltaStr = `+${gap.toFixed(2)}s`;
        }
      }

      return {
        socketId: p.socketId,
        userId: p.userId,
        username: p.username,
        avatar: p.avatar || 'default',
        progress: p.progress,
        wpm: p.wpm,
        accuracy: p.accuracy,
        finished: p.finished,
        finishTime: p.finishTime || null,
        lapTime: lapTimeStr,
        delta: deltaStr,
        rank: p.finished ? idx + 1 : null,
        isBot: Boolean(p.isBot)
      };
    });
  }

  broadcastLeaderboard(io, roomId) {
    const room = this.races.get(roomId);
    if (!room) return;
    const leaderboard = this.buildLeaderboard(room);
    io.to(roomId).emit('race:leaderboard', { leaderboard });
  }

  // --- PERSISTENCE ---
  async persistRaceResultIfUser(room, player, rank = 1) {
    try {
      if (!player.userId || player.saved || player.isBot) return;

      // Prevent duplicate asynchronous calls
      player.saved = true;

      const durationMs =
        player.finishTime && room.startedAt
          ? Math.max(0, player.finishTime - room.startedAt)
          : 0;
      const charsTyped = room.passageText ? room.passageText.length : 0;
      const validWpm = Math.max(0, Math.min(400, Math.round(player.wpm || 0)));
      const validAccuracy = Math.max(0, Math.min(100, Math.round(player.accuracy ?? 100)));
      const isWinner = rank === 1;

      const rr = new RaceResult({
        user: player.userId,
        passage: room.passageId || null,
        wpm: validWpm,
        accuracy: validAccuracy,
        charsTyped,
        durationMs,
        rank,
        isWinner
      });

      await rr.save();

      const user = await User.findById(player.userId);
      if (user) {
        await user.updateStats({
          wpm: validWpm,
          accuracy: validAccuracy,
          durationMs,
          isWinner
        });
      }
    } catch (err) {
      console.error(`❌ Error persisting race result for user ${player.userId}:`, err.message);
    }
  }

  // --- ROOM CREATION ---
  async createRoom({ hostSocketId, user = null, universe = null, difficulty = null, isBotRoom = false, botCount = 3 }) {
    const roomId = isBotRoom
      ? `solo_${Math.random().toString(36).slice(2, 8)}`
      : Math.floor(100000 + Math.random() * 900000).toString();

    let passageDoc = null;
    try {
      passageDoc = await Passage.getRandom({ universe, difficulty });
    } catch (e) {
      console.warn('Could not fetch passage from DB, using fallback.');
    }

    const passageText = passageDoc?.text || DEFAULT_PASSAGE_TEXT;
    const userIdToUse = user?.id || null;
    const usernameToUse = (user?.username || 'Player').trim().slice(0, 25);

    const room = {
      id: roomId,
      passageId: passageDoc?._id || null,
      passageText,
      source: passageDoc?.source || 'Key-Sprint',
      universe: passageDoc?.universe || universe || 'general',
      difficulty: passageDoc?.difficulty || difficulty || 'medium',
      hostSocketId,
      players: {},
      startedAt: null,
      status: 'waiting', // waiting | countdown | running | finished
      winnerSocketId: null,
      createdAt: Date.now(),
      isBotRoom
    };

    // Add host player
    room.players[hostSocketId] = {
      socketId: hostSocketId,
      userId: userIdToUse,
      username: usernameToUse,
      avatar: user?.avatar || 'default',
      progress: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      finishTime: null,
      saved: false,
      isBot: false
    };

    // If bot room, populate bots
    if (isBotRoom) {
      const validBotCount = Math.min(Math.max(parseInt(botCount, 10) || 3, 1), 5);
      const botNames = ['CyberRacer', 'SpeedyBot', 'ByteRunner', 'KeyNinja', 'TurboTyper'];
      for (let i = 1; i <= validBotCount; i++) {
        const botId = `bot_${i}_${roomId}`;
        const targetWpm = 35 + Math.floor(Math.random() * 45); // 35-80 WPM
        room.players[botId] = {
          socketId: botId,
          userId: null,
          username: botNames[i - 1] || `Bot ${i}`,
          avatar: 'bot',
          progress: 0,
          wpm: targetWpm,
          accuracy: 95 + Math.floor(Math.random() * 5),
          finished: false,
          finishTime: null,
          isBot: true
        };
      }
    }

    this.races.set(roomId, room);
    this.socketToRoom.set(hostSocketId, roomId);

    // Setup Room TTL
    const ttlTimer = setTimeout(() => {
      this.deleteRoom(roomId);
    }, ROOM_TTL_MS);
    this.registerTimer(roomId, ttlTimer);

    return room;
  }

  // --- JOIN ROOM ---
  joinRoom(roomId, socketId, user = null, io = null) {
    const cleanRoomId = roomId.toString().trim();
    const room = this.races.get(cleanRoomId);

    if (!room) return { ok: false, error: 'Room not found' };
    if (room.status === 'finished') return { ok: false, error: 'Race is already finished' };
    if (room.status === 'running') return { ok: false, error: 'Race is currently in progress' };

    const userIdToUse = user?.id || null;
    const usernameToUse = (user?.username || `Racer_${Math.floor(1000 + Math.random() * 9000)}`).trim().slice(0, 25);

    // Multi-Tab / Duplicate Account Check:
    // Check if the user is already in this room from another tab/device
    let existingSocketId = null;
    for (const [sId, player] of Object.entries(room.players)) {
      if (!player.isBot) {
        if (userIdToUse && player.userId && player.userId.toString() === userIdToUse.toString()) {
          existingSocketId = sId;
          break;
        } else if (!userIdToUse && player.username.toLowerCase() === usernameToUse.toLowerCase()) {
          existingSocketId = sId;
          break;
        }
      }
    }

    if (existingSocketId) {
      if (existingSocketId === socketId) {
        // Same socket re-joining, already present
        return { ok: true, room, transferred: false };
      }

      // Transfer active session from old tab to new tab
      const existingPlayer = room.players[existingSocketId];
      delete room.players[existingSocketId];
      this.socketToRoom.delete(existingSocketId);

      // Reassign player record to new socketId
      existingPlayer.socketId = socketId;
      room.players[socketId] = existingPlayer;
      this.socketToRoom.set(socketId, cleanRoomId);

      // If old tab was the host, migrate host privilege to new tab
      if (room.hostSocketId === existingSocketId) {
        room.hostSocketId = socketId;
      }

      // Notify the old tab socket that its session was transferred
      if (io) {
        io.to(existingSocketId).emit('room:sessionTransferred', {
          message: 'Your racing session was transferred to a newer tab.'
        });
      }

      return { ok: true, room, transferred: true };
    }

    // New unique player joining
    const currentPlayers = Object.keys(room.players);
    if (currentPlayers.length >= MAX_PLAYERS_PER_ROOM) {
      return { ok: false, error: 'Room is full (max 10 players)' };
    }

    room.players[socketId] = {
      socketId,
      userId: userIdToUse,
      username: usernameToUse,
      avatar: user?.avatar || 'default',
      progress: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      finishTime: null,
      saved: false,
      isBot: false
    };

    this.socketToRoom.set(socketId, cleanRoomId);
    return { ok: true, room, transferred: false };
  }

  // --- QUICK MATCH (Queue / Instant Matchmaking) ---
  async quickMatch(socketId, user = null, { universe = null, difficulty = null } = {}, io = null) {
    // 1. Look for an existing waiting human room that has space
    for (const [roomId, room] of this.races.entries()) {
      if (
        !room.isBotRoom &&
        room.status === 'waiting' &&
        Object.keys(room.players).length < MAX_PLAYERS_PER_ROOM
      ) {
        // If universe is requested, match it, otherwise match any open room
        if (!universe || universe === 'all' || room.universe === universe.toLowerCase()) {
          const joinResult = this.joinRoom(roomId, socketId, user, io);
          if (joinResult.ok) {
            return { ok: true, roomId, room: joinResult.room, createdNew: false };
          }
        }
      }
    }

    // 2. If no open room found, create a new public waiting room
    const room = await this.createRoom({
      hostSocketId: socketId,
      user,
      universe,
      difficulty,
      isBotRoom: false
    });

    return { ok: true, roomId: room.id, room, createdNew: true };
  }

  // --- START RACE COUNTDOWN ---
  startRaceCountdown(roomId, hostSocketId, countdownSec = 5, io) {
    const room = this.races.get(roomId);
    if (!room) return { ok: false, error: 'Room not found' };

    // Host verification (or auto-start for bot rooms)
    if (!room.isBotRoom && socketIdNotHost(socketIdNotHost, room.hostSocketId, hostSocketId)) {
      return { ok: false, error: 'Only the host can start the race' };
    }

    if (room.status === 'running' || room.status === 'countdown') {
      return { ok: false, error: 'Race is already in countdown or active' };
    }

    // Official FIA F1 Start Sequence: 5 red lights (1s each = 5s) + random hold (0.5s - 1.8s)
    const validCountdown = 5;
    const randomHoldMs = Math.floor(500 + Math.random() * 1300);
    const totalCountdownMs = validCountdown * 1000 + randomHoldMs;

    room.status = 'countdown';
    const startAt = Date.now() + totalCountdownMs;
    room.startedAt = startAt;

    io.to(roomId).emit('race:countdown', {
      startAt,
      countdownSec,
      randomHoldMs,
      totalCountdownMs
    });

    const startTimer = setTimeout(() => {
      const currentRoom = this.races.get(roomId);
      if (!currentRoom || currentRoom.status !== 'countdown') return;

      currentRoom.status = 'running';
      io.to(roomId).emit('race:started', {
        startedAt: currentRoom.startedAt,
        passageText: currentRoom.passageText,
        source: currentRoom.source,
        universe: currentRoom.universe,
        difficulty: currentRoom.difficulty
      });

      this.broadcastLeaderboard(io, roomId);

      // Start bot simulations if any exist
      this.startBotSimulation(roomId, io);

      // Auto-finish safety timer (prevents abandoned hanging race rooms)
      const raceMaxTimer = setTimeout(() => {
        this.forceFinishRace(roomId, io);
      }, MAX_RACE_DURATION_MS);
      this.registerTimer(roomId, raceMaxTimer);

    }, totalCountdownMs);

    this.registerTimer(roomId, startTimer);
    return { ok: true, startAt };
  }

  // --- BOT SIMULATION ---
  startBotSimulation(roomId, io) {
    const room = this.races.get(roomId);
    if (!room) return;

    const botPlayers = Object.values(room.players).filter((p) => p.isBot);
    if (botPlayers.length === 0) return;

    const passageLength = Math.max(1, room.passageText.length);

    botPlayers.forEach((bot) => {
      const charsPerSec = (bot.wpm * 5) / 60;
      const progressPerSec = (charsPerSec / passageLength) * 100;

      const botInterval = setInterval(async () => {
        const currentRoom = this.races.get(roomId);
        if (!currentRoom || currentRoom.status !== 'running' || bot.finished) {
          clearInterval(botInterval);
          return;
        }

        // Add subtle natural jitter (+/- 10%)
        const jitter = (Math.random() * 0.2 - 0.1) * progressPerSec;
        bot.progress = Math.min(100, bot.progress + progressPerSec + jitter);

        if (bot.progress >= 100) {
          bot.finished = true;
          bot.progress = 100;
          bot.finishTime = Date.now();

          const elapsedMin = Math.max(0.01, (bot.finishTime - (currentRoom.startedAt || bot.finishTime)) / 60000);
          bot.wpm = Math.round((passageLength / 5) / elapsedMin);

          clearInterval(botInterval);
        }

        this.broadcastLeaderboard(io, roomId);
        this.checkRaceCompletion(roomId, io);
      }, 1000);

      this.registerTimer(roomId, botInterval);
    });
  }

  // --- UPDATE PROGRESS ---
  async updatePlayerProgress(roomId, socketId, { progress, wpm, accuracy }, io) {
    const room = this.races.get(roomId);
    if (!room || room.status !== 'running') return;

    const player = room.players[socketId];
    if (!player || player.finished) return;

    // Apply anti-cheat & validation
    const sanitized = sanitizeProgressInput({
      progress,
      wpm,
      accuracy,
      roomStartedAt: room.startedAt,
      previousProgress: player.progress,
      passageLength: room.passageText?.length || 100
    });

    player.progress = sanitized.progress;
    player.wpm = sanitized.wpm;
    player.accuracy = sanitized.accuracy;

    if (player.progress >= 100 && !player.finished) {
      player.finished = true;
      player.finishTime = Date.now();

      // Check if first winner
      if (!room.winnerSocketId) {
        room.winnerSocketId = socketId;
      }

      const leaderboard = this.buildLeaderboard(room);
      const playerRank = leaderboard.findIndex((p) => p.socketId === socketId) + 1;
      await this.persistRaceResultIfUser(room, player, playerRank);
    }

    this.broadcastLeaderboard(io, roomId);
    this.checkRaceCompletion(roomId, io);
  }

  // --- FINISH PLAYER DIRECTLY ---
  async finishPlayer(roomId, socketId, io) {
    const room = this.races.get(roomId);
    if (!room) return;

    const player = room.players[socketId];
    if (!player || player.finished) return;

    player.finished = true;
    player.progress = 100;
    player.finishTime = Date.now();

    const elapsedMin = Math.max(0.01, (player.finishTime - (room.startedAt || player.finishTime)) / 60000);
    const charsTyped = room.passageText ? room.passageText.length : 100;
    const computedWpm = Math.min(350, Math.max(1, Math.round((charsTyped / 5) / elapsedMin)));

    if (!player.wpm || player.wpm === 0) {
      player.wpm = computedWpm;
    }

    if (!room.winnerSocketId) {
      room.winnerSocketId = socketId;
    }

    const leaderboard = this.buildLeaderboard(room);
    const playerRank = leaderboard.findIndex((p) => p.socketId === socketId) + 1;
    await this.persistRaceResultIfUser(room, player, playerRank);

    this.broadcastLeaderboard(io, roomId);
    this.checkRaceCompletion(roomId, io);
  }

  // --- CHECK RACE COMPLETION ---
  checkRaceCompletion(roomId, io) {
    const room = this.races.get(roomId);
    if (!room || room.status === 'finished') return;

    const players = Object.values(room.players);
    const unfinished = players.filter((p) => !p.finished);

    if (unfinished.length === 0) {
      this.concludeRace(room, io);
    }
  }

  forceFinishRace(roomId, io) {
    const room = this.races.get(roomId);
    if (!room || room.status === 'finished') return;
    console.log(`⏱️ Race in room [${roomId}] reached maximum duration timeout. Finalizing standings.`);
    this.concludeRace(room, io);
  }

  concludeRace(room, io) {
    room.status = 'finished';
    this.clearRoomTimers(room.id);
    const finalLeaderboard = this.buildLeaderboard(room);
    const winner = finalLeaderboard[0] || null;

    io.to(room.id).emit('race:finished', {
      finalLeaderboard,
      winner
    });
  }

  // --- REMATCH / PLAY AGAIN ---
  async requestRematch(roomId, socketId, io) {
    const room = this.races.get(roomId);
    if (!room) return { ok: false, error: 'Room not found' };

    // Host check for multiplayer rooms
    if (!room.isBotRoom && room.hostSocketId !== socketId) {
      return { ok: false, error: 'Only the host can initiate a rematch' };
    }

    // Fetch a new passage
    let passageDoc = null;
    try {
      passageDoc = await Passage.getRandom({
        universe: room.universe,
        difficulty: room.difficulty
      });
    } catch (e) {
      console.warn('Could not fetch new passage for rematch, using fallback.');
    }

    room.passageId = passageDoc?._id || null;
    room.passageText = passageDoc?.text || DEFAULT_PASSAGE_TEXT;
    room.source = passageDoc?.source || 'Key-Sprint';
    room.status = 'waiting';
    room.startedAt = null;
    room.winnerSocketId = null;

    // Reset player scores while keeping them in room
    Object.values(room.players).forEach((player) => {
      player.progress = 0;
      player.wpm = player.isBot ? player.wpm : 0;
      player.accuracy = 100;
      player.finished = false;
      player.finishTime = null;
      player.saved = false;
    });

    this.clearRoomTimers(roomId);

    io.to(roomId).emit('room:rematchReady', {
      roomId,
      room: {
        id: roomId,
        passageId: room.passageId,
        passageText: room.passageText,
        source: room.source,
        universe: room.universe,
        difficulty: room.difficulty,
        status: room.status,
        hostSocketId: room.hostSocketId,
        players: this.buildLeaderboard(room)
      }
    });

    if (room.isBotRoom) {
      // Auto countdown for bot room rematch
      this.startRaceCountdown(roomId, socketId, 3, io);
    }

    return { ok: true, room };
  }

  // --- SOCIAL: REACTIONS & CHAT ---
  sendReaction(roomId, socketId, emoji, io) {
    const room = this.races.get(roomId);
    if (!room) return;
    const player = room.players[socketId];
    if (!player) return;

    const validEmoji = String(emoji).slice(0, 10);
    io.to(roomId).emit('room:reaction', {
      socketId,
      username: player.username,
      emoji: validEmoji,
      timestamp: Date.now()
    });
  }

  sendChat(roomId, socketId, message, io) {
    const room = this.races.get(roomId);
    if (!room) return;
    const player = room.players[socketId];
    if (!player) return;

    const cleanMessage = String(message || '').trim().slice(0, 120);
    if (!cleanMessage) return;

    io.to(roomId).emit('room:chat', {
      socketId,
      username: player.username,
      message: cleanMessage,
      timestamp: Date.now()
    });
  }

  // --- EXIT & DISCONNECT HANDLING ---
  handlePlayerExit(socketId, io, explicitRoomId = null) {
    const roomId = explicitRoomId || this.socketToRoom.get(socketId);
    if (!roomId) return;

    this.socketToRoom.delete(socketId);
    const room = this.races.get(roomId);
    if (!room) return;

    delete room.players[socketId];

    const remainingPlayers = Object.values(room.players);
    const remainingHumans = remainingPlayers.filter((p) => !p.isBot);

    // If no humans remain, delete room cleanly
    if (remainingHumans.length === 0) {
      this.deleteRoom(roomId);
      return;
    }

    // Reassign host if host disconnected
    if (room.hostSocketId === socketId) {
      room.hostSocketId = remainingHumans[0].socketId;
      io.to(roomId).emit('room:newHost', {
        hostSocketId: room.hostSocketId,
        hostUsername: remainingHumans[0].username
      });
    }

    io.to(roomId).emit('room:playerLeft', {
      socketId,
      players: this.buildLeaderboard(room)
    });

    // Check if remaining players finish the race
    if (room.status === 'running') {
      this.checkRaceCompletion(roomId, io);
    }
  }

  // --- HEALTH & METRICS ---
  getMetrics() {
    let totalPlayers = 0;
    let activeRaces = 0;

    for (const room of this.races.values()) {
      totalPlayers += Object.keys(room.players || {}).length;
      if (room.status === 'running' || room.status === 'countdown') {
        activeRaces++;
      }
    }

    return {
      activeRooms: this.races.size,
      activeRaces,
      connectedPlayers: totalPlayers
    };
  }
}

function socketIdNotHost(fn, hostId, socketId) {
  return hostId !== socketId;
}

export const roomManager = new RoomManager();
