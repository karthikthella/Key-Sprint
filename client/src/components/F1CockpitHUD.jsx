import React from 'react';
import { Zap, Gauge, Flame, ShieldAlert } from 'lucide-react';

export default function F1CockpitHUD({ wpm = 0, accuracy = 100, progress = 0 }) {
  // Gear mapping based on WPM
  const gear =
    wpm <= 25 ? 1 : wpm <= 45 ? 2 : wpm <= 65 ? 3 : wpm <= 80 ? 4 : wpm <= 95 ? 5 : wpm <= 110 ? 6 : wpm <= 125 ? 7 : 8;

  // Rev Lights (Total 15 lights: 5 Green, 5 Red, 5 Blue)
  const activeLights = Math.min(15, Math.round((wpm / 130) * 15));
  const isDrsActive = wpm >= 80 && accuracy >= 95;

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-[#252532] bg-[#0c0d14] p-2.5 shadow-xl">
      
      {/* 15-LED Shift Light RPM Bar */}
      <div className="flex items-center justify-center gap-1 rounded border border-[#1e1f2b] bg-[#141520] py-1.5 px-2">
        {[...Array(15)].map((_, i) => {
          const isLit = i < activeLights;
          let bulbColor = '#00d2be'; // First 5 Green
          if (i >= 5 && i < 10) bulbColor = '#e10600'; // Middle 5 Red
          if (i >= 10) bulbColor = '#3b82f6'; // Top 5 Blue

          return (
            <div
              key={i}
              className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full border border-black/80 transition-colors duration-75"
              style={{
                backgroundColor: isLit ? bulbColor : '#1e202d',
                boxShadow: isLit ? `0 0 6px ${bulbColor}` : 'none'
              }}
            />
          );
        })}
      </div>

      {/* 2x2 Compact Square Dashboard Grid (Fits perfectly under Leaderboard) */}
      <div className="grid grid-cols-2 gap-1.5">
        
        {/* Box 1: Digital Gear */}
        <div className="flex flex-col items-center justify-center rounded border border-[#20212f] bg-[#12131d] py-1.5 px-2">
          <span className="font-telemetry text-[9px] tracking-widest text-zinc-500">GEAR</span>
          <span className="font-f1 text-2xl font-black leading-tight text-white">{gear}</span>
        </div>

        {/* Box 2: Speedometer (WPM) */}
        <div className="flex flex-col items-center justify-center rounded border border-[#20212f] bg-[#12131d] py-1.5 px-2">
          <span className="font-telemetry text-[9px] tracking-widest text-zinc-500">SPEED (WPM)</span>
          <span className="font-f1 text-2xl font-black leading-tight text-[#00d2be]">{wpm}</span>
        </div>

        {/* Box 3: Throttle Accuracy */}
        <div className="flex flex-col items-center justify-center rounded border border-[#20212f] bg-[#12131d] py-1.5 px-2">
          <span className="font-telemetry text-[9px] tracking-widest text-zinc-500">ACCURACY</span>
          <span className={`font-f1 text-2xl font-black leading-tight ${accuracy >= 98 ? 'text-[#3fb950]' : accuracy >= 90 ? 'text-[#ffd700]' : 'text-[#e10600]'}`}>
            {accuracy}%
          </span>
        </div>

        {/* Box 4: DRS Status */}
        <div className="flex flex-col items-center justify-center rounded border border-[#20212f] bg-[#12131d] py-1.5 px-2">
          <span className="font-telemetry text-[9px] tracking-widest text-zinc-500">DRS ZONE</span>
          <div
            className={`mt-0.5 flex items-center gap-1 rounded px-2 py-0.5 font-f1 text-xs tracking-wider ${
              isDrsActive
                ? 'bg-[#00d2be] text-black shadow-[0_0_10px_#00d2be] font-black animate-pulse'
                : 'bg-[#1b1c28] text-zinc-500'
            }`}
          >
            <Zap className="h-3 w-3" />
            <span>{isDrsActive ? 'OPEN' : 'LOCKED'}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
