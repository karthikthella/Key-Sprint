import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Flame, Award, Timer, CheckCircle } from 'lucide-react';
import { getTeamByIndex, getDriverCode } from '../theme/f1Constants';

const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export default function F1PostRacePodium({
  finalLeaderboard = [],
  winner,
  onRematch,
  isHost,
  currentSocketId
}) {
  useEffect(() => {
    // Launch celebratory champagne confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }, []);

  const p1 = finalLeaderboard[0];
  const p2 = finalLeaderboard[1];
  const p3 = finalLeaderboard[2];

  return (
    <div className="flex w-full flex-col gap-6 py-4">
      
      {/* Top Banner: Grand Prix Final Classification Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#252532] bg-[#12131c] p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#e10600] px-2 py-0.5 font-f1 text-xs text-white skew-f1">
              <span className="unskew-f1">FIA FORMULA 1</span>
            </span>
            <h2 className="font-f1 text-2xl tracking-wider text-white">
              PROVISIONAL CLASSIFICATION
            </h2>
          </div>
          <p className="font-telemetry text-xs text-zinc-400">
            GRAND PRIX RESULTS • POINTS AWARDED
          </p>
        </div>

        {/* Rematch Button */}
        {isHost ? (
          <button
            onClick={onRematch}
            className="flex items-center gap-2 rounded-md bg-[#e10600] px-6 py-2.5 font-f1 text-sm tracking-wider text-white shadow-[0_0_20px_rgba(225,6,0,0.6)] transition-transform hover:scale-105"
          >
            <RefreshCw className="h-4 w-4" />
            <span>PLAY AGAIN / REMATCH</span>
          </button>
        ) : (
          <div className="font-telemetry text-xs text-zinc-400">
            Awaiting host to initiate rematch...
          </div>
        )}
      </div>

      {/* Top 3 Podium Visualization */}
      <div className="flex items-end justify-center gap-3 pt-6 pb-2">
        
        {/* P2 (Silver - Left) */}
        {p2 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="mb-2 flex flex-col items-center">
              <span className="font-f1 text-xs text-zinc-300">{p2.username}</span>
              <span className="font-telemetry text-[10px] font-bold text-[#d1d5db]">{p2.wpm} WPM</span>
            </div>
            <div className="flex h-28 w-24 flex-col items-center justify-between rounded-t-lg border-t-2 border-[#d1d5db] bg-[#141522] p-2 shadow-lg sm:w-32">
              <span className="font-f1 text-2xl text-[#d1d5db]">2ND</span>
              <span className="rounded bg-[#d1d5db]/20 px-2 py-0.5 font-telemetry text-xs font-bold text-[#d1d5db]">
                +18 PTS
              </span>
            </div>
          </motion.div>
        )}

        {/* P1 (Gold Winner - Center) */}
        {p1 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="mb-2 flex flex-col items-center">
              <Trophy className="h-6 w-6 text-[#ffd700] animate-bounce" />
              <span className="font-f1 text-sm font-black text-[#ffd700]">{p1.username}</span>
              <span className="font-telemetry text-xs font-bold text-white">{p1.wpm} WPM</span>
            </div>
            <div className="flex h-36 w-28 flex-col items-center justify-between rounded-t-lg border-t-4 border-[#ffd700] bg-linear-to-b from-[#ffd700]/20 to-[#141522] p-2 shadow-[0_0_25px_rgba(255,215,0,0.3)] sm:w-36">
              <span className="font-f1 text-3xl font-black text-[#ffd700]">1ST</span>
              <span className="rounded bg-[#ffd700] px-3 py-0.5 font-f1 text-xs font-black text-black">
                +25 PTS
              </span>
            </div>
          </motion.div>
        )}

        {/* P3 (Bronze - Right) */}
        {p3 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="mb-2 flex flex-col items-center">
              <span className="font-f1 text-xs text-zinc-300">{p3.username}</span>
              <span className="font-telemetry text-[10px] font-bold text-[#cd7f32]">{p3.wpm} WPM</span>
            </div>
            <div className="flex h-20 w-24 flex-col items-center justify-between rounded-t-lg border-t-2 border-[#cd7f32] bg-[#141522] p-2 shadow-lg sm:w-32">
              <span className="font-f1 text-xl text-[#cd7f32]">3RD</span>
              <span className="rounded bg-[#cd7f32]/20 px-2 py-0.5 font-telemetry text-xs font-bold text-[#cd7f32]">
                +15 PTS
              </span>
            </div>
          </motion.div>
        )}

      </div>

      {/* Official Standings Table */}
      <div className="overflow-hidden rounded-xl border border-[#252532] bg-[#0c0d14]">
        <table className="w-full text-left font-telemetry text-xs">
          <thead className="border-b border-[#252532] bg-[#141520] font-f1 text-[11px] text-zinc-400">
            <tr>
              <th className="py-2.5 px-3">POS</th>
              <th className="py-2.5 px-3">DRIVER</th>
              <th className="py-2.5 px-3">TEAM</th>
              <th className="py-2.5 px-3 text-right">TIME / GAP</th>
              <th className="py-2.5 px-3 text-right">SPEED</th>
              <th className="py-2.5 px-3 text-right">ACCURACY</th>
              <th className="py-2.5 px-3 text-right">POINTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1c28]">
            {finalLeaderboard.map((player, idx) => {
              const pos = idx + 1;
              const team = getTeamByIndex(idx);
              const isMe = player.socketId === currentSocketId;
              const points = F1_POINTS[idx] || 0;

              return (
                <tr
                  key={player.socketId || idx}
                  className={`transition-colors ${isMe ? 'bg-[#181a28]' : 'hover:bg-[#12131d]'}`}
                >
                  <td className="py-3 px-3 font-f1 text-sm font-bold text-white">
                    {pos === 1 ? '🥇 P1' : pos === 2 ? '🥈 P2' : pos === 3 ? '🥉 P3' : `P${pos}`}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: team.primaryColor }}
                      />
                      <span className="font-f1 text-sm text-white">{player.username}</span>
                      {isMe && (
                        <span className="rounded bg-[#00d2be] px-1 font-f1 text-[9px] text-black">
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-zinc-400">{team.name}</td>
                  <td className="py-3 px-3 text-right font-telemetry text-xs font-bold text-zinc-300">
                    {player.delta || (player.lapTime ? `${player.lapTime}` : '--')}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-[#00d2be]">{player.wpm} WPM</td>
                  <td className="py-3 px-3 text-right font-bold">
                    {player.accuracy === 100 ? (
                      <span className="rounded bg-[#ffd700]/20 px-1.5 py-0.5 text-[#ffd700]" title="100% Clean Lap Bonus">
                        100% ⭐
                      </span>
                    ) : (
                      <span className={player.accuracy >= 95 ? 'text-zinc-200' : 'text-[#ff6b6b]'}>
                        {player.accuracy || 100}%
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-f1 text-sm font-bold text-[#ffd700]">
                    +{points + (player.accuracy === 100 ? 1 : 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
