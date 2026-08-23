import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../theme/f1Constants';

export default function F1StartGantry({ countdownData }) {
  // lightCount from 0 to 5 (number of lit red light columns)
  const [litColumns, setLitColumns] = useState(0);
  const [lightsOut, setLightsOut] = useState(false);

  useEffect(() => {
    setLitColumns(0);
    setLightsOut(false);

    // Official F1 Sequence: 1 second per column (1s, 2s, 3s, 4s, 5s)
    const timers = [];

    for (let i = 1; i <= 5; i++) {
      const t = setTimeout(() => {
        setLitColumns(i);
        soundEngine.playLightBeep(false);
      }, (i - 1) * 1000);
      timers.push(t);
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [countdownData]);

  return (
    <div className="flex flex-col items-center justify-center py-6">
      
      {/* Starting Gantry Frame with F1 Truss Structure */}
      <div className="relative flex flex-col items-center">
        
        {/* Overhead Gantry Beam */}
        <div className="mb-1 flex h-2 w-72 items-center justify-between bg-[#1d1f2b] px-4 shadow-md sm:w-96">
          <div className="h-1 w-8 bg-[#383a50]"></div>
          <div className="font-telemetry text-[8px] tracking-[0.3em] text-zinc-500">FIA STARTING SYSTEM</div>
          <div className="h-1 w-8 bg-[#383a50]"></div>
        </div>

        {/* 5 Dual-Bulb F1 Light Pods */}
        <div className="flex items-center gap-2 rounded-xl border border-[#303348] bg-[#0c0d15] p-3 shadow-[0_15px_40px_rgba(0,0,0,0.9)] sm:gap-3 sm:p-4">
          {[1, 2, 3, 4, 5].map((podIndex) => {
            const isLit = litColumns >= podIndex && !lightsOut;

            return (
              <div
                key={podIndex}
                className="flex flex-col items-center gap-2 rounded-lg border border-[#1e202d] bg-[#12131e] px-2.5 py-2"
              >
                {/* Upper Red Bulb */}
                <motion.div
                  animate={{
                    boxShadow: isLit
                      ? '0 0 25px #ff1a1a, 0 0 45px #e10600'
                      : 'none'
                  }}
                  transition={{ duration: 0.1 }}
                  className={`h-6 w-6 rounded-full border border-black/90 transition-colors duration-75 sm:h-7 sm:w-7 ${
                    isLit ? 'bg-[#ff1a1a]' : 'bg-[#220707]'
                  }`}
                />

                {/* Lower Red Bulb (F1 dual-light design) */}
                <motion.div
                  animate={{
                    boxShadow: isLit
                      ? '0 0 25px #ff1a1a, 0 0 45px #e10600'
                      : 'none'
                  }}
                  transition={{ duration: 0.1 }}
                  className={`h-6 w-6 rounded-full border border-black/90 transition-colors duration-75 sm:h-7 sm:w-7 ${
                    isLit ? 'bg-[#ff1a1a]' : 'bg-[#220707]'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Gantry Subtitle */}
        <div className="mt-3 flex items-center gap-2 font-telemetry text-xs tracking-wider text-zinc-400">
          {litColumns < 5 ? (
            <span>HOLDING ON GRID... ({litColumns}/5 LIGHTS)</span>
          ) : (
            <span className="animate-pulse font-bold text-[#ff1a1a]">ALL 5 LIGHTS ON • AWAITING LIGHTS OUT...</span>
          )}
        </div>
      </div>

    </div>
  );
}
