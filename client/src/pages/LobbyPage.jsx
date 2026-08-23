import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Users, Bot, Play, Trophy, Flag, Sparkles, Shield } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [usernameInput, setUsernameInput] = useState(
    user?.username || localStorage.getItem('keysprint_guest_name') || `Racer_${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [universe, setUniverse] = useState('quotes');
  const [difficulty, setDifficulty] = useState('medium');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const saveName = () => {
    localStorage.setItem('keysprint_guest_name', usernameInput);
  };

  const handleQuickMatch = () => {
    if (!socket) return;
    setErrorMsg('');
    setLoading(true);
    saveName();

    socket.emit(
      'room:quickMatch',
      { username: usernameInput, universe, difficulty },
      (res) => {
        setLoading(false);
        if (res.ok) {
          navigate(`/race/${res.room.id}`, { state: { initialRoom: res.room } });
        } else {
          setErrorMsg(res.error || 'Quick match queue failed');
        }
      }
    );
  };

  const handleCreateRoom = () => {
    if (!socket) return;
    setErrorMsg('');
    setLoading(true);
    saveName();

    socket.emit(
      'room:create',
      { username: usernameInput, universe, difficulty },
      (res) => {
        setLoading(false);
        if (res.ok) {
          navigate(`/race/${res.room.id}`, { state: { initialRoom: res.room } });
        } else {
          setErrorMsg(res.error || 'Failed to create room');
        }
      }
    );
  };

  const handleJoinRoom = () => {
    if (!socket || !joinRoomId.trim()) return;
    setErrorMsg('');
    saveName();
    navigate(`/race/${joinRoomId.trim()}`);
  };

  const handleCreateBotRoom = () => {
    if (!socket) return;
    setErrorMsg('');
    setLoading(true);
    saveName();

    socket.emit(
      'room:createBotRoom',
      { username: usernameInput, universe, difficulty, botCount: 3 },
      (res) => {
        setLoading(false);
        if (res.ok) {
          navigate(`/race/${res.room.id}`, { state: { initialRoom: res.room } });
        } else {
          setErrorMsg(res.error || 'Failed to initialize AI bots');
        }
      }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="w-full max-w-3xl">
        
        {/* Hero Championship Banner */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#252532] bg-[#12131d] p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] sm:p-8">
          <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-[#e10600]/20 blur-[90px]"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-2 bg-[#e10600] px-3 py-1 font-f1 text-xs tracking-wider text-white skew-f1 shadow-[0_0_15px_rgba(225,6,0,0.5)]">
              <span className="unskew-f1">2026 WORLD CHAMPIONSHIP</span>
            </div>
            <h1 className="font-f1 text-4xl tracking-wider text-white sm:text-6xl">
              KEY<span className="text-[#e10600]">-</span>SPRINT
            </h1>
            <p className="mt-2 max-w-md font-telemetry text-sm text-zinc-400">
              High-Octane Formula 1 Multiplayer Typing Arena. Test your raw WPM and reaction speed against world drivers.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-[#e10600] bg-[#e10600]/10 p-3 font-telemetry text-xs text-[#ff6b6b]">
            <span>🚨 {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="font-bold underline">DISMISS</button>
          </div>
        )}

        {/* Lobby Action Card */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#252532] bg-[#0e0f17] p-5 shadow-xl sm:p-6">
          
          {/* Driver Name & Paddock Presets */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            
            {/* Driver Name Input */}
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                DRIVER CALLSIGN
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter callsign"
                className="rounded-lg border border-[#252532] bg-[#141522] px-3 py-2 font-f1 text-sm tracking-wider text-white outline-none focus:border-[#00d2be]"
              />
            </div>

            {/* Universe Selector */}
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                PASSAGE UNIVERSE
              </label>
              <select
                value={universe}
                onChange={(e) => setUniverse(e.target.value)}
                className="cursor-pointer rounded-lg border border-[#252532] bg-[#141522] px-3 py-2 font-telemetry text-xs font-bold text-white outline-none hover:text-[#00d2be]"
              >
                <option value="quotes" className="bg-[#141522]">Speeches & Icons</option>
                <option value="tech" className="bg-[#141522]">Tech & Science</option>
                <option value="movies" className="bg-[#141522]">Cinema & TV</option>
                <option value="gaming" className="bg-[#141522]">Gaming Lore</option>
                <option value="anime" className="bg-[#141522]">Anime Excerpts</option>
                <option value="literature" className="bg-[#141522]">Literature</option>
              </select>
            </div>

            {/* Difficulty Selector */}
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                RACE DIFFICULTY
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="cursor-pointer rounded-lg border border-[#252532] bg-[#141522] px-3 py-2 font-telemetry text-xs font-bold uppercase text-white outline-none hover:text-[#00d2be]"
              >
                <option value="medium" className="bg-[#141522]">Standard (Medium)</option>
                <option value="easy" className="bg-[#141522]">Sprint (Easy)</option>
                <option value="hard" className="bg-[#141522]">Endurance (Hard)</option>
              </select>
            </div>

          </div>

          {/* Primary Game Mode Action Buttons */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
            
            {/* Quick Match */}
            <button
              onClick={handleQuickMatch}
              disabled={loading}
              className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-[#252532] bg-[#141522] p-4 text-left transition-all hover:border-[#00d2be] hover:shadow-[0_0_20px_rgba(0,210,190,0.2)] disabled:opacity-50"
            >
              <div className="flex flex-col">
                <span className="font-f1 text-lg text-white group-hover:text-[#00d2be]">
                  ⚡ QUICK MATCH
                </span>
                <span className="font-telemetry text-xs text-zinc-400">
                  Instant multiplayer queue
                </span>
              </div>
              <Zap className="h-6 w-6 text-[#00d2be]" />
            </button>

            {/* Create Private GP Room */}
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-[#252532] bg-[#141522] p-4 text-left transition-all hover:border-[#e10600] hover:shadow-[0_0_20px_rgba(225,6,0,0.2)] disabled:opacity-50"
            >
              <div className="flex flex-col">
                <span className="font-f1 text-lg text-white group-hover:text-[#e10600]">
                  ➕ CREATE GP ROOM
                </span>
                <span className="font-telemetry text-xs text-zinc-400">
                  Host custom race with friends
                </span>
              </div>
              <Users className="h-6 w-6 text-[#e10600]" />
            </button>
          </div>

          {/* Join Code & Bot Practice */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
            
            {/* Join Room by ID */}
            <div className="flex items-center rounded-xl border border-[#252532] bg-[#141522] p-1.5 focus-within:border-[#ffd700]">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="ENTER ROOM CODE"
                className="w-full bg-transparent px-3 font-telemetry text-xs uppercase text-white outline-none placeholder:text-zinc-600"
              />
              <button
                onClick={handleJoinRoom}
                className="rounded-lg bg-[#252638] px-4 py-2 font-f1 text-xs text-white hover:bg-[#ffd700] hover:text-black"
              >
                JOIN
              </button>
            </div>

            {/* Solo Practice with Bots */}
            <button
              onClick={handleCreateBotRoom}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#252532] bg-[#141522] p-2.5 font-f1 text-sm tracking-wider text-zinc-300 hover:border-[#3671c6] hover:text-white disabled:opacity-50"
            >
              <Bot className="h-4 w-4 text-[#64c4ff]" />
              <span>PRACTICE WITH AI BOTS</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
