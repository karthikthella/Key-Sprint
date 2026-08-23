import React from 'react';
import { motion } from 'framer-motion';
import { getTeamByIndex, getDriverCode } from '../theme/f1Constants';

export default function F1RaceTrack({ players = [], currentSocketId }) {
  // Max 4 lanes strictly
  const displayPlayers = players.slice(0, 4);

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-xl border border-[#252532] bg-[#0c0d15] p-2 shadow-inner">
      
      {/* Track Curbs (Top Rumble Strip) */}
      <div
        className="h-1.5 w-full opacity-60 rounded-t"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #e10600 0px, #e10600 12px, #ffffff 12px, #ffffff 24px)'
        }}
      />

      {/* Multi-Lane Tarmac Area (Max 4 Lanes) */}
      <div className="relative my-1 flex flex-col gap-1 py-1">
        {/* Start Grid Line */}
        <div className="absolute left-2 top-0 bottom-0 z-10 w-1 border-r border-dashed border-white/40" />

        {/* Finish Line (Checkered Texture) */}
        <div
          className="absolute right-0 top-0 bottom-0 z-10 w-4 opacity-80"
          style={{
            backgroundImage:
              'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 8px 8px'
          }}
        />

        {/* Each Driver's Racing Lane */}
        {displayPlayers.map((player, idx) => {
          const team = getTeamByIndex(idx);
          const driverCode = getDriverCode(player.username);
          const isMe = player.socketId === currentSocketId;
          const progress = Math.min(95, Math.max(0, player.progress || 0));
          const hasDrs = (player.wpm || 0) >= 80;

          return (
            <div
              key={player.socketId || idx}
              className="relative flex h-6.5 w-full items-center border-b border-[#181926] last:border-0"
            >
              {/* Lane Grid Marker */}
              <span className="absolute left-1 font-telemetry text-[8px] font-bold text-zinc-600">
                L{idx + 1}
              </span>

              {/* Animated F1 Car Container */}
              <motion.div
                animate={{ left: `calc(${progress}% + 12px)` }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="absolute top-0 bottom-0 flex items-center z-20"
              >
                {/* Driver Tag Floating Badge */}
                <div className="flex items-center gap-1 -translate-y-0.5">
                  <div
                    className={`flex items-center gap-1 rounded px-1 py-0.2 shadow-md ${
                      isMe
                        ? 'border border-[#00d2be] bg-[#00d2be] text-black font-black'
                        : 'bg-[#181a28] text-white'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <span className="font-f1 text-[9px]">{driverCode}</span>
                    <span className="font-telemetry text-[8px] opacity-80">{player.wpm || 0}</span>
                  </div>

                  {/* F1 Car Top-Down Silhouette */}
                  <div className="relative flex items-center">
                    {/* DRS / Exhaust Speed Glow */}
                    {hasDrs && (
                      <div className="absolute -left-2.5 h-1.5 w-3 rounded-full bg-linear-to-r from-transparent to-[#00d2be] blur-[2px] animate-pulse" />
                    )}

                    {/* SVG F1 Car Model */}
                    <svg
                      width="32"
                      height="13"
                      viewBox="0 0 38 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    >
                      {/* Rear Wing */}
                      <rect x="1" y="2" width="3" height="12" rx="1" fill="#111" />
                      {/* Body Chassis */}
                      <path
                        d="M4 5C4 4 6 3 10 3H26C30 3 36 6 37 8C36 10 30 13 26 13H10C6 13 4 12 4 11V5Z"
                        fill={team.primaryColor}
                      />
                      {/* Cockpit Halo */}
                      <circle cx="18" cy="8" r="3" fill="#111" />
                      <circle cx="18" cy="8" r="1.5" fill="#f1f1f1" />
                      {/* Front Wing */}
                      <path d="M34 1H37V15H34V1Z" fill="#222" />
                      {/* Wheels */}
                      <rect x="8" y="0" width="5" height="3" rx="1" fill="#000" />
                      <rect x="8" y="13" width="5" height="3" rx="1" fill="#000" />
                      <rect x="25" y="0" width="5" height="3" rx="1" fill="#000" />
                      <rect x="25" y="13" width="5" height="3" rx="1" fill="#000" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Track Curbs (Bottom Rumble Strip) */}
      <div
        className="h-1.5 w-full opacity-60 rounded-b"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #e10600 0px, #e10600 12px, #ffffff 12px, #ffffff 24px)'
        }}
      />
    </div>
  );
}
