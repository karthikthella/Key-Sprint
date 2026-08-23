import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Flag, Users, Copy, Check } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

// F1 Components
import F1StartGantry from '../components/F1StartGantry';
import F1StartingGrid from '../components/F1StartingGrid';
import F1TimingTower from '../components/F1TimingTower';
import F1RaceTrack from '../components/F1RaceTrack';
import F1TypingArena from '../components/F1TypingArena';
import F1CockpitHUD from '../components/F1CockpitHUD';
import F1TeamRadio from '../components/F1TeamRadio';
import F1PostRacePodium from '../components/F1PostRacePodium';

export default function RacePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, socketId } = useSocket();
  const { user } = useAuth();

  const [room, setRoom] = useState(location.state?.initialRoom || null);
  const [gameState, setGameState] = useState('GRID'); // GRID | COUNTDOWN | RACING | PODIUM
  const [errorMsg, setErrorMsg] = useState('');

  // Racing Metrics
  const [passageText, setPassageText] = useState('');
  const [passageSource, setPassageSource] = useState('');
  const [passageUniverse, setPassageUniverse] = useState('');
  const [typedText, setTypedText] = useState('');
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [raceStartTime, setRaceStartTime] = useState(null);

  // Leaderboards & Comms
  const [liveLeaderboard, setLiveLeaderboard] = useState(location.state?.initialRoom?.players || []);
  const [finalWinner, setFinalWinner] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  const usernameToUse =
    user?.username || localStorage.getItem('keysprint_guest_name') || `Racer_${Math.floor(1000 + Math.random() * 9000)}`;

  // Auto-join room on load if not already in state
  useEffect(() => {
    if (!socket || !roomId) return;

    // If joining fresh via URL
    if (!location.state?.initialRoom) {
      socket.emit('room:join', { roomId, username: usernameToUse }, (res) => {
        if (res.ok) {
          setRoom(res.room);
          setLiveLeaderboard(res.room.players || []);
        } else {
          setErrorMsg(res.error || 'Failed to join room');
          setTimeout(() => navigate('/'), 2000);
        }
      });
    }

    // Socket listeners for this room
    const handleRoomState = ({ room: r }) => {
      setRoom(r);
      setLiveLeaderboard(r.players || []);
    };

    const handlePlayerJoined = ({ player, players }) => {
      setLiveLeaderboard(players);
      setRoom((prev) => (prev ? { ...prev, players } : prev));
      addSystemMessage(`${player.username} has joined the starting grid.`);
    };

    const handlePlayerLeft = ({ socketId: sId, players }) => {
      setLiveLeaderboard(players);
      setRoom((prev) => (prev ? { ...prev, players } : prev));
      addSystemMessage('A driver has returned to the paddock.');
    };

    const handleNewHost = ({ hostSocketId, hostUsername }) => {
      setRoom((prev) => (prev ? { ...prev, hostSocketId } : prev));
      addSystemMessage(`👑 Pole position host delegated to ${hostUsername || 'new host'}.`);
    };

    const handleCountdown = () => {
      setGameState('COUNTDOWN');
    };

    const handleRaceStarted = ({ passageText: text, source: src, universe: uni }) => {
      setPassageText(text);
      setPassageSource(src);
      setPassageUniverse(uni);
      setTypedText('');
      setWpm(0);
      setAccuracy(100);
      setRaceStartTime(Date.now());
      setGameState('RACING');
    };

    const handleLeaderboard = ({ leaderboard }) => {
      setLiveLeaderboard(leaderboard);
    };

    const handleRaceFinished = ({ finalLeaderboard, winner }) => {
      setLiveLeaderboard(finalLeaderboard);
      setFinalWinner(winner);
      setGameState('PODIUM');
    };

    const handleRematchReady = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      setLiveLeaderboard(updatedRoom.players || []);
      setTypedText('');
      setWpm(0);
      setAccuracy(100);
      setFinalWinner(null);
      setGameState('GRID');
      addSystemMessage('🔄 Track reset! All drivers lined up for Rematch.');
    };

    const handleChat = ({ username: u, message: m }) => {
      setChatMessages((prev) => [...prev.slice(-30), { username: u, message: m }]);
    };

    const handleReaction = ({ username: u, emoji: e }) => {
      setChatMessages((prev) => [...prev.slice(-30), { username: u, message: e }]);
    };

    const handleSessionTransferred = ({ message: msg }) => {
      setErrorMsg(`⚠️ ${msg || 'Your racing session was transferred to another active tab or device.'}`);
    };

    socket.on('room:state', handleRoomState);
    socket.on('room:playerJoined', handlePlayerJoined);
    socket.on('room:playerLeft', handlePlayerLeft);
    socket.on('room:newHost', handleNewHost);
    socket.on('race:countdown', handleCountdown);
    socket.on('race:started', handleRaceStarted);
    socket.on('race:leaderboard', handleLeaderboard);
    socket.on('race:finished', handleRaceFinished);
    socket.on('room:rematchReady', handleRematchReady);
    socket.on('room:chat', handleChat);
    socket.on('room:reaction', handleReaction);
    socket.on('room:sessionTransferred', handleSessionTransferred);

    return () => {
      socket.off('room:state', handleRoomState);
      socket.off('room:playerJoined', handlePlayerJoined);
      socket.off('room:playerLeft', handlePlayerLeft);
      socket.off('room:newHost', handleNewHost);
      socket.off('race:countdown', handleCountdown);
      socket.off('race:started', handleRaceStarted);
      socket.off('race:leaderboard', handleLeaderboard);
      socket.off('race:finished', handleRaceFinished);
      socket.off('room:rematchReady', handleRematchReady);
      socket.off('room:chat', handleChat);
      socket.off('room:reaction', handleReaction);
      socket.off('room:sessionTransferred', handleSessionTransferred);
    };
  }, [socket, roomId]);

  const addSystemMessage = (msg) => {
    setChatMessages((prev) => [...prev.slice(-30), { username: 'FIA RACE CONTROL', message: msg }]);
  };

  const handleStartRace = () => {
    if (!socket || !roomId) return;
    socket.emit('race:start', { roomId }, (res) => {
      if (!res.ok) setErrorMsg(res.error);
    });
  };

  const handleTypingInput = (value, computedAcc = 100) => {
    setTypedText(value);

    const elapsedMin = Math.max(0.01, (Date.now() - (raceStartTime || Date.now())) / 60000);
    const computedWpm = Math.round((value.length / 5) / elapsedMin) || 0;
    const progress = Math.min(100, Math.round((value.length / (passageText.length || 1)) * 100));

    setWpm(computedWpm);
    setAccuracy(computedAcc);

    socket &&
      socket.emit('race:progress', {
        roomId,
        progress,
        wpm: computedWpm,
        accuracy: computedAcc
      });

    if (progress >= 100) {
      socket && socket.emit('race:finish', { roomId });
    }
  };

  const handleRematch = () => {
    if (!socket || !roomId) return;
    socket.emit('race:rematch', { roomId }, (res) => {
      if (!res.ok) setErrorMsg(res.error);
    });
  };

  const handleSendChat = (message) => {
    if (!socket || !roomId) return;
    socket.emit('room:chat', { roomId, message });
  };

  const handleSendReaction = (emoji) => {
    if (!socket || !roomId) return;
    socket.emit('room:reaction', { roomId, emoji });
  };

  const handleLeaveRoom = () => {
    if (socket && roomId) {
      socket.emit('room:leave', { roomId });
    }
    navigate('/');
  };

  const isHost = room?.hostSocketId === socketId;

  return (
    <div className="flex w-full flex-col gap-4 py-2">
      
      {/* Top Header: Back to Paddock Button & Room Info */}
      <div className="flex items-center justify-between border-b border-[#252532] pb-3">
        <button
          onClick={handleLeaveRoom}
          className="flex items-center gap-2 rounded-md border border-[#252532] bg-[#141522] px-3 py-1.5 font-f1 text-xs tracking-wider text-zinc-300 transition-colors hover:border-[#e10600] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>LEAVE PADDOCK</span>
        </button>

        <div className="flex items-center gap-3 font-telemetry text-xs">
          <span className="text-zinc-400">
            ROOM: <strong className="text-[#00d2be]">{roomId}</strong>
          </span>
          <span className="text-zinc-400">
            DRIVERS: <strong className="text-white">{liveLeaderboard.length}</strong>
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-lg border border-[#e10600] bg-[#e10600]/10 p-3 font-telemetry text-xs text-[#ff6b6b]">
          <span>🚨 {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-bold underline">DISMISS</button>
        </div>
      )}

      {/* --- STAGE 1: STARTING GRID LOBBY --- */}
      {gameState === 'GRID' && (
        <F1StartingGrid
          room={room}
          currentSocketId={socketId}
          isHost={isHost}
          onStartRace={handleStartRace}
          onAddBots={() => {}}
          onQuickMatch={() => {}}
        />
      )}

      {/* --- STAGE 2 & 3: COUNTDOWN & ACTIVE RACE COCKPIT --- */}
      {(gameState === 'COUNTDOWN' || gameState === 'RACING') && (
        <div className="flex flex-col gap-2.5">
          
          {/* Top Slot: 5-Light Start Gantry during Countdown, swapped for Race Track when Lights Out */}
          {gameState === 'COUNTDOWN' ? (
            <F1StartGantry />
          ) : (
            <F1RaceTrack
              players={liveLeaderboard.slice(0, 4)}
              currentSocketId={socketId}
            />
          )}

          {/* 3-Column Cockpit Layout - Perfectly Top-Aligned */}
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12 items-start">
            
            {/* Left Column: Timing Tower + 2x2 Cockpit Telemetry HUD */}
            <div className="flex flex-col gap-2 lg:col-span-3">
              <F1TimingTower
                leaderboard={liveLeaderboard.slice(0, 4)}
                currentSocketId={socketId}
              />
              <F1CockpitHUD
                wpm={wpm}
                accuracy={accuracy}
                progress={Math.round((typedText.length / (passageText.length || 1)) * 100)}
              />
            </div>

            {/* Center Column: 3-Line Middle-Row Rolling Typing Arena */}
            <div className="flex flex-col lg:col-span-6">
              <F1TypingArena
                passageText={passageText}
                typedText={typedText}
                onInputChange={handleTypingInput}
                disabled={gameState === 'COUNTDOWN'}
                source={passageSource}
                universe={passageUniverse}
                leaderWpm={liveLeaderboard[0]?.wpm || 0}
                userAvgWpm={user?.avgWPM || 60}
              />
            </div>

            {/* Right Column: Pit Wall Radio & Comms */}
            <div className="flex flex-col lg:col-span-3">
              <F1TeamRadio
                onSendChat={handleSendChat}
                onSendReaction={handleSendReaction}
                chatMessages={chatMessages}
              />
            </div>

          </div>

        </div>
      )}

      {/* --- STAGE 4: POST-RACE PODIUM & CLASSIFICATION --- */}
      {gameState === 'PODIUM' && (
        <F1PostRacePodium
          finalLeaderboard={liveLeaderboard}
          winner={finalWinner}
          onRematch={handleRematch}
          isHost={isHost}
          currentSocketId={socketId}
        />
      )}

    </div>
  );
}
