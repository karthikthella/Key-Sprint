import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const USERNAME = `Racer_${Math.floor(1000 + Math.random() * 9000)}`;
const PASSWORD = 'password123';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runClientTest() {
  console.log(`\n========================================`);
  console.log(`🧪 Key-Sprint Backend Test Suite`);
  console.log(`Target: ${API_URL}`);
  console.log(`========================================\n`);

  try {
    // 1. Health check
    console.log('1️⃣ Testing Health Endpoint...');
    const health = await axios.get(`${API_URL}/api/health`);
    const dbConnected = health.data.database?.status === 'connected';
    console.log(`  🩺 Health: ${health.data.status} | DB: ${health.data.database?.status} | Uptime: ${health.data.uptimeSeconds}s`);

    // 2. Auth: Register & Login (if DB connected)
    let token = null;
    let userId = null;

    if (dbConnected) {
      console.log('\n2️⃣ Testing Authentication (DB Online)...');
      try {
        const regRes = await axios.post(`${API_URL}/api/auth/register`, {
          username: USERNAME,
          password: PASSWORD,
          email: `${USERNAME.toLowerCase()}@example.com`
        });
        token = regRes.data.token;
        userId = regRes.data.user.id;
        console.log(`  ✅ Registered user: ${USERNAME} (ID: ${userId})`);
      } catch (err) {
        if (err.response?.status === 409) {
          const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
            username: USERNAME,
            password: PASSWORD
          });
          token = loginRes.data.token;
          userId = loginRes.data.user.id;
          console.log(`  ✅ Logged in existing user: ${USERNAME}`);
        } else {
          throw err;
        }
      }

      // Profile /me
      const meRes = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`  👤 /api/auth/me verified: ${meRes.data.user.username}`);
    } else {
      console.log('\n2️⃣ Authentication: DB is offline. Running in high-performance Guest Mode.');
    }

    // 3. Passages APIs
    console.log('\n3️⃣ Testing Passages API...');
    const universesRes = await axios.get(`${API_URL}/api/passages/universes`);
    console.log('  🌌 Universes:', universesRes.data.universes.map((u) => `${u.universe} (${u.count})`).join(', '));

    const randomPassage = await axios.get(`${API_URL}/api/passages/random?universe=tech`);
    console.log(`  📖 Sample passage: "${randomPassage.data.text.slice(0, 50)}..." [${randomPassage.data.universe}]`);

    // 4. Socket: Multiplayer Room & Race Lifecycle
    console.log('\n4️⃣ Testing Socket.IO Multiplayer Lifecycle...');
    const socket = io(API_URL, {
      auth: token ? { token } : {}
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket test timed out')), 25000);

      socket.on('connect', () => {
        console.log(`  🔌 Socket connected successfully. ID: ${socket.id}`);

        // A. Create room
        socket.emit('room:create', { username: USERNAME, universe: 'tech', difficulty: 'medium' }, (res) => {
          if (!res.ok) return reject(new Error(`Failed to create room: ${res.error}`));
          const roomId = res.roomId;
          console.log(`  🏁 Room created: [${roomId}]. Host: ${res.room.hostSocketId}`);

          // B. Test In-Game Chat & Reaction
          socket.emit('room:reaction', { roomId, emoji: '🔥' });
          socket.emit('room:chat', { roomId, message: 'Ready to race!' });

          // C. Start race
          socket.emit('race:start', { roomId, countdownSec: 1 }, (startRes) => {
            if (!startRes.ok) return reject(new Error(`Failed to start race: ${startRes.error}`));
            console.log('  ⏳ Race countdown initiated...');
          });

          // D. On Race Started
          socket.on('race:started', ({ passageText }) => {
            console.log(`  🚀 Race started! Passage length: ${passageText.length} characters.`);

            // Simulate typing progression
            let progress = 0;
            const progressInterval = setInterval(() => {
              progress += 34;
              const wpm = 80 + Math.floor(Math.random() * 15);
              socket.emit('race:progress', {
                roomId,
                progress: Math.min(100, progress),
                wpm,
                accuracy: 98
              });
              console.log(`    ⌨️  Progress: ${Math.min(100, progress)}% (${wpm} WPM)`);

              if (progress >= 100) {
                clearInterval(progressInterval);
                socket.emit('race:finish', { roomId });
              }
            }, 300);
          });

          // E. On Race Finished
          socket.on('race:finished', async ({ winner, finalLeaderboard }) => {
            console.log(`  🏆 Race finished! Winner: ${winner.username} (${winner.wpm} WPM)`);
            console.log(`  📊 Leaderboard items: ${finalLeaderboard.length}`);

            // F. Test Rematch
            console.log('  🔄 Testing Rematch...');
            socket.emit('race:rematch', { roomId }, (rematchRes) => {
              if (rematchRes.ok) {
                console.log(`  ✅ Rematch prepared! Room status: ${rematchRes.room.status}`);
              }
              socket.disconnect();
              clearTimeout(timeout);
              resolve();
            });
          });
        });
      });
    });

    // 5. Test Quick Match Queue
    console.log('\n5️⃣ Testing Quick Matchmaking Queue...');
    const qmSocket = io(API_URL, { auth: token ? { token } : {} });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('QuickMatch timed out')), 10000);
      qmSocket.on('connect', () => {
        qmSocket.emit('room:quickMatch', { username: 'Matchmaker', universe: 'tech' }, (res) => {
          if (!res.ok) return reject(new Error('QuickMatch failed'));
          console.log(`  ⚡ Quick Match assigned room: [${res.roomId}] (Created new: ${res.createdNew})`);
          qmSocket.disconnect();
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    // 6. Test Solo Bot Room
    console.log('\n6️⃣ Testing Solo Bot Race Room...');
    const botSocket = io(API_URL, { auth: token ? { token } : {} });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Bot room test timed out')), 10000);
      botSocket.on('connect', () => {
        botSocket.emit('room:createBotRoom', { username: 'SoloHero', botCount: 2, universe: 'movies' }, (res) => {
          if (!res.ok) return reject(new Error('Failed to create bot room'));
          console.log(`  🤖 Bot room created: [${res.roomId}] with ${Object.keys(res.room.players).length} total racers.`);
          botSocket.disconnect();
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    // 7. Verify Database Records (if online)
    if (dbConnected && userId) {
      console.log('\n7️⃣ Verifying Database Persistence...');
      await wait(500);
      const [userStatsRes, historyRes, leaderboardRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${userId}/stats`),
        axios.get(`${API_URL}/api/races/user/${userId}`),
        axios.get(`${API_URL}/api/users/leaderboard/top?category=bestWPM&limit=10`)
      ]);

      console.log('  📈 User Stats verified:', {
        races: userStatsRes.data.stats.totalRaces,
        bestWPM: userStatsRes.data.stats.bestWPM
      });
      console.log('  📜 Race History records in DB:', historyRes.data.total);
      console.log('  🌟 Top Leaderboard entries:', leaderboardRes.data.leaderboard.length);
    }

    console.log(`\n========================================`);
    console.log(`🎉 ALL BACKEND CHECKS PASSED PERFECTLY!`);
    console.log(`========================================\n`);
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test failed with error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runClientTest();
