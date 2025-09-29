// testClient.js
import axios from "axios";
import { io } from "socket.io-client";

const API_URL = "http://localhost:5000"; // your backend
const USERNAME = "boosterclub";
const PASSWORD = "supersecret";

async function main() {
  try {
    // 1. Try register
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        username: USERNAME,
        password: PASSWORD,
        email: "alice@example.com"
      });
      console.log("✅ Registered new user:", USERNAME);
    } catch (err) {
      if (err.response?.status === 409) {
        console.log("ℹ️ User already exists, skipping register");
      } else {
        throw err;
      }
    }

    // 2. Login
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      username: USERNAME,
      password: PASSWORD
    });
    const token = loginRes.data.token;
    const userId = loginRes.data.user.id;
    console.log("✅ Logged in, got token, userId:", userId);

    // 3. Fetch a random passage
    const passageRes = await axios.get(`${API_URL}/api/passages/random`);
    const passage = passageRes.data;
    console.log("📖 Picked random passage:", passage.text.slice(0, 80) + "...");

    // 4. Connect Socket.IO with token
    const socket = io(API_URL, {
      auth: { token }
    });

    socket.on("connect", () => {
      console.log("🔌 Connected to server:", socket.id);

      // 5. Create race room with passageId (optional: include passage text for debug)
      socket.emit(
        "room:create",
        { username: USERNAME, passageId: passage._id },
        (res) => {
          if (res.ok) {
            console.log("🏁 Room created:", res.roomId);

            // 6. Simulate progress every second
            let progress = 0;
            const interval = setInterval(() => {
              progress += 20; // 20% steps
              socket.emit("race:progress", {
                roomId: res.roomId,
                progress,
                wpm: 60 + Math.floor(Math.random() * 20),
                accuracy: 95
              });
              console.log(`⌨️ progress: ${progress}%`);

              if (progress >= 100) {
                clearInterval(interval);
                // 7. Finish race
                socket.emit("race:finish", { roomId: res.roomId });
                console.log("✅ Race finished");
              }
            }, 1000);
          } else {
            console.log("❌ Room create failed:", res.error);
          }
        }
      );
    });

    socket.on("room:state", (data) => {
      console.log("📢 Room state update:", data);
    });

    socket.on("race:leaderboard", (data) => {
      console.log("📊 Leaderboard:", data);
    });

    // 8. After race finished, fetch history
    socket.on("race:finished", async (data) => {
      console.log("🏆 Race finished! Winner:", data.winner);
      console.log("Final leaderboard:", data.finalLeaderboard);

      try {
        const historyRes = await axios.get(`${API_URL}/api/races/user/${userId}`);
        console.log("📜 Race history:");
        historyRes.data.forEach((race, i) => {
          console.log(
            `#${i + 1}: WPM=${race.wpm}, Accuracy=${race.accuracy}, Passage="${race.passage?.text?.slice(0, 50)}..."`
          );
        });
      } catch (err) {
        console.error("❌ Failed to fetch history:", err.response?.data || err.message);
      }

      // close socket after showing history
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
    });
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

main();
