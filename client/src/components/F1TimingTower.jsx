import React from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import { getTeamByIndex, getDriverCode } from '../theme/f1Constants';

export default function F1TimingTower({ leaderboard = [], currentSocketId }) {
  // Max 4 drivers strictly displayed for perfect viewport alignment
  const displayDrivers = leaderboard.slice(0, 4);
  const maxWpm = Math.max(...displayDrivers.map((p) => p.wpm || 0), 0);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-[#252532] bg-[#000000] shadow-[0_8px_25px_rgba(0,0,0,0.8)]">
      
      {/* Official F1 Tower Header */}
      <div className="flex items-center justify-between border-b border-[#252532] bg-[#0c0d14] px-2.5 py-1.5">
        <div className="flex items-center gap-2">
          {/* Slanted F1 Red Badge */}
          <div className="flex h-4.5 items-center bg-[#e10600] px-2 font-f1 text-[10px] text-white skew-f1 shadow-[0_0_8px_rgba(225,6,0,0.6)]">
            <span className="unskew-f1">F1</span>
          </div>
          <span className="font-f1 text-xs tracking-wider text-white">
            LEADERBOARD
          </span>
        </div>
        <span className="font-telemetry text-[10px] font-bold text-[#00d2be]">
          LAP 1/1
        </span>
      </div>

      {/* Driver Cards (Official F1 Broadcast Strip Layout) */}
      <div className="flex flex-col space-y-px bg-[#181926]">
        {displayDrivers.length === 0 ? (
          <div className="p-3 text-center font-telemetry text-xs text-zinc-500">
            Awaiting Grid Formation...
          </div>
        ) : (
          displayDrivers.map((player, idx) => {
            const pos = idx + 1;
            const team = getTeamByIndex(idx);
            const driverCode = getDriverCode(player.username);
            const isMe = player.socketId === currentSocketId;
            const isFastest = player.wpm > 0 && player.wpm === maxWpm;
            const leader = displayDrivers[0];
            const progress = Math.min(100, Math.max(0, player.progress || 0));

            // Clean formatted delta (rounded to integer or 1 decimal)
            const gap =
              pos === 1
                ? 'LEADER'
                : player.finished
                ? 'FINISHED'
                : `+${Math.max(0, (leader?.progress || 0) - progress).toFixed(0)}%`;

            return (
              <motion.div
                key={player.socketId || idx}
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={`relative flex h-7.5 items-center justify-between overflow-hidden bg-[#0c0d14] pr-2 transition-colors ${
                  isMe ? 'bg-[#151726]' : 'hover:bg-[#12131e]'
                }`}
              >
                {/* Micro Progress Bar on Bottom */}
                <div
                  className="absolute bottom-0 left-0 h-[2px] opacity-70 transition-all duration-150"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: isMe ? '#00d2be' : team.primaryColor
                  }}
                />

                {/* Left Side: POS Number + 4px Team Stripe + Driver 3-Letter Tag */}
                <div className="flex h-full items-center">
                  
                  {/* Position Pill */}
                  <div
                    className={`flex h-full w-5 shrink-0 items-center justify-center font-f1 text-[11px] ${
                      pos === 1
                        ? 'bg-[#ffd700] text-black font-black'
                        : pos === 2
                        ? 'bg-[#e5e7eb] text-black font-black'
                        : pos === 3
                        ? 'bg-[#d97706] text-black font-black'
                        : 'bg-[#151620] text-zinc-300'
                    }`}
                  >
                    {pos}
                  </div>

                  {/* 4px Constructor Stripe */}
                  <div
                    className="h-full w-1 shrink-0"
                    style={{ backgroundColor: team.primaryColor }}
                  />

                  {/* 3-Letter Driver Code */}
                  <div className="flex h-full items-center bg-[#181924] px-1.5">
                    <span
                      className={`font-f1 text-[11px] tracking-wider ${
                        isMe ? 'text-[#00d2be] font-black' : 'text-white'
                      }`}
                    >
                      {driverCode}
                    </span>
                  </div>

                  {/* Soft Tire Compound Indicator (Red S) */}
                  <div className="ml-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#e8002d] font-telemetry text-[8px] font-black text-white">
                    S
                  </div>
                </div>

                {/* Right Side: Fastest Lap Icon + Live Speed & Gap */}
                <div className="flex items-center gap-1.5">
                  {/* Fastest Lap 🟣 Purple Stopwatch */}
                  {isFastest && (
                    <div
                      title="Fastest Lap Speed"
                      className="flex h-4 items-center gap-0.5 rounded bg-[#b138dd] px-1 font-telemetry text-[8px] font-black text-white shadow-[0_0_8px_#b138dd]"
                    >
                      <Timer className="h-2.5 w-2.5" />
                    </div>
                  )}

                  {/* Live WPM & Clean Gap */}
                  <div className="flex flex-col items-end leading-none">
                    <span className="font-telemetry text-[10px] font-bold text-white">
                      {player.wpm || 0} <span className="text-[7px] font-normal text-zinc-400">WPM</span>
                    </span>
                    <span className={`font-telemetry text-[8px] font-bold ${pos === 1 ? 'text-[#ffd700]' : 'text-zinc-400'}`}>
                      {gap}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

    </div>
  );
}
