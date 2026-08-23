import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Play, Copy, Check, Users, Bot, Shield, Zap } from 'lucide-react';
import { getTeamByIndex, getDriverCode } from '../theme/f1Constants';

export default function F1StartingGrid({
  room,
  currentSocketId,
  isHost,
  onStartRace,
  onAddBots,
  onQuickMatch
}) {
  const [copied, setCopied] = useState(false);

  const rawPlayers = room?.players || [];
  const players = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
  const oddPositions = players.filter((_, i) => i % 2 === 0); // P1, P3, P5...
  const evenPositions = players.filter((_, i) => i % 2 === 1); // P2, P4, P6...

  const copyRoomCode = () => {
    if (!room?.id) return;
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      
      {/* Top Banner: Grand Prix Starting Grid Header & Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#252532] bg-[#12131c] p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#e10600] px-2 py-0.5 font-f1 text-xs text-white skew-f1">
              <span className="unskew-f1">FORMULA 1</span>
            </span>
            <h2 className="font-f1 text-xl tracking-wide text-white sm:text-2xl">
              OFFICIAL STARTING GRID
            </h2>
          </div>
          <p className="mt-1 font-telemetry text-xs text-zinc-400">
            ROOM CODE: <span className="font-bold text-[#00d2be]">{room?.id}</span> • {players.length} DRIVERS ON GRID
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Room Code */}
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1.5 rounded-md border border-[#2e3042] bg-[#1a1b28] px-3 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-[#00d2be] hover:text-[#00d2be]"
          >
            {copied ? <Check className="h-4 w-4 text-[#00d2be]" /> : <Copy className="h-4 w-4" />}
            <span className="font-telemetry">{copied ? 'COPIED!' : 'SHARE CODE'}</span>
          </button>

          {/* Host: Start Race Button */}
          {isHost ? (
            <button
              onClick={() => onStartRace(3)}
              className="flex items-center gap-2 rounded-md bg-[#e10600] px-5 py-2 font-f1 text-sm tracking-wider text-white shadow-[0_0_20px_rgba(225,6,0,0.6)] transition-transform hover:scale-105"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>START FORMATION LAP</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-[#2e3042] bg-[#161723] px-4 py-2 font-telemetry text-xs text-zinc-400">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#ffd700]"></span>
              <span>WAITING FOR HOST TO START...</span>
            </div>
          )}
        </div>
      </div>

      {/* Staggered Starting Grid Columns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* Left Column: Row 1 (P1), Row 2 (P3), Row 3 (P5)... */}
        <div className="flex flex-col gap-3">
          <div className="border-b border-[#252532] pb-1 font-telemetry text-[11px] font-bold tracking-[0.2em] text-zinc-500">
            POLE POSITION SIDE
          </div>
          {oddPositions.map((player, idx) => {
            const gridPos = idx * 2 + 1;
            const team = getTeamByIndex(gridPos - 1);
            const driverCode = getDriverCode(player.username);
            const isMe = player.socketId === currentSocketId;

            return (
              <GridCard
                key={player.socketId || idx}
                pos={gridPos}
                driver={player}
                driverCode={driverCode}
                team={team}
                isMe={isMe}
              />
            );
          })}
        </div>

        {/* Right Column: Row 1 (P2), Row 2 (P4), Row 3 (P6)... (Staggered Downwards) */}
        <div className="flex flex-col gap-3 md:pt-6">
          <div className="border-b border-[#252532] pb-1 font-telemetry text-[11px] font-bold tracking-[0.2em] text-zinc-500">
            OUTSIDE GRID LINE
          </div>
          {evenPositions.map((player, idx) => {
            const gridPos = idx * 2 + 2;
            const team = getTeamByIndex(gridPos - 1);
            const driverCode = getDriverCode(player.username);
            const isMe = player.socketId === currentSocketId;

            return (
              <GridCard
                key={player.socketId || idx}
                pos={gridPos}
                driver={player}
                driverCode={driverCode}
                team={team}
                isMe={isMe}
              />
            );
          })}
        </div>

      </div>

    </div>
  );
}

function GridCard({ pos, driver, driverCode, team, isMe }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group relative flex items-center justify-between overflow-hidden rounded-lg border bg-[#141520] p-3 transition-colors ${
        isMe ? 'border-[#00d2be] shadow-[0_0_15px_rgba(0,210,190,0.15)]' : 'border-[#252636] hover:border-[#3d3f54]'
      }`}
    >
      {/* Team Color Vertical Stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: team.primaryColor }}
      />

      <div className="flex items-center gap-3 pl-2">
        {/* Position Number Pill */}
        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0b0c12] font-f1 text-lg text-white">
          P{pos}
        </div>

        {/* Driver Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-f1 text-sm tracking-wider text-white">
              {driver.username}
            </span>
            <span className="rounded bg-black/50 px-1.5 py-0.5 font-telemetry text-[10px] font-bold text-zinc-400">
              {driverCode}
            </span>
            {driver.isBot && (
              <span className="flex items-center gap-1 rounded bg-[#3671c6]/20 px-1.5 py-0.5 font-telemetry text-[9px] text-[#64c4ff]">
                <Bot className="h-3 w-3" /> AI
              </span>
            )}
            {isMe && (
              <span className="rounded bg-[#00d2be] px-1.5 py-0.5 font-f1 text-[9px] text-black">
                YOU
              </span>
            )}
          </div>
          <span className="font-telemetry text-[10px] text-zinc-400">
            {team.name}
          </span>
        </div>
      </div>

      {/* Grid Ready Status Pill */}
      <div className="flex items-center gap-1.5 rounded-full bg-[#0b0c12] px-2.5 py-1">
        <span className="h-2 w-2 rounded-full bg-[#00d2be] shadow-[0_0_6px_#00d2be]"></span>
        <span className="font-telemetry text-[10px] font-bold text-zinc-300">
          GRID READY
        </span>
      </div>
    </motion.div>
  );
}
