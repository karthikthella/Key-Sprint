import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, X, Flame, Shield, Award, Medal } from 'lucide-react';
import { getTeamByIndex } from '../theme/f1Constants';

export default function F1GlobalLeaderboard({ isOpen, onClose }) {
  const [category, setCategory] = useState('bestWPM');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:5000/api/users/leaderboard/top?category=${category}&limit=20`);
        setDrivers(res.data.leaderboard || []);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, category]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#303248] bg-[#0c0d15] shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252636] bg-[#141522] p-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#e10600] px-2 py-0.5 font-f1 text-sm text-white skew-f1">
              <span className="unskew-f1">FIA</span>
            </div>
            <div>
              <h2 className="font-f1 text-lg tracking-wider text-white">
                WORLD DRIVERS' CHAMPIONSHIP
              </h2>
              <p className="font-telemetry text-[10px] text-zinc-400">
                OFFICIAL SEASON STANDINGS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2e3044] bg-[#1a1b2a] text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-[#252636] bg-[#0e0f18] p-2">
          <button
            onClick={() => setCategory('bestWPM')}
            className={`flex-1 rounded-md py-2 font-f1 text-xs tracking-wider transition-colors ${
              category === 'bestWPM'
                ? 'bg-[#e10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.5)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🟣 FASTEST LAP (PEAK WPM)
          </button>
          <button
            onClick={() => setCategory('avgWPM')}
            className={`flex-1 rounded-md py-2 font-f1 text-xs tracking-wider transition-colors ${
              category === 'avgWPM'
                ? 'bg-[#e10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.5)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🟢 RACE PACE (AVG WPM)
          </button>
          <button
            onClick={() => setCategory('racesWon')}
            className={`flex-1 rounded-md py-2 font-f1 text-xs tracking-wider transition-colors ${
              category === 'racesWon'
                ? 'bg-[#e10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.5)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🏆 GRAND PRIX WINS
          </button>
        </div>

        {/* Standings Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="p-8 text-center font-telemetry text-xs text-zinc-500">
              Retrieving FIA Timing Telemetry...
            </div>
          ) : drivers.length === 0 ? (
            <div className="p-8 text-center font-telemetry text-xs text-zinc-500">
              No registered race data recorded in this championship yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {drivers.map((driver, idx) => {
                const pos = idx + 1;
                const team = getTeamByIndex(idx);

                return (
                  <div
                    key={driver._id || idx}
                    className="relative flex items-center justify-between overflow-hidden rounded-lg border border-[#202130] bg-[#12131d] p-3"
                  >
                    {/* Team Color Stripe */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ backgroundColor: team.primaryColor }}
                    />

                    <div className="flex items-center gap-3 pl-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded font-f1 text-xs ${
                          pos === 1
                            ? 'bg-[#ffd700] text-black font-black'
                            : pos === 2
                            ? 'bg-[#d1d5db] text-black font-black'
                            : pos === 3
                            ? 'bg-[#cd7f32] text-black font-black'
                            : 'bg-[#1a1b28] text-zinc-400'
                        }`}
                      >
                        {pos}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-f1 text-sm text-white">
                          {driver.username}
                        </span>
                        <span className="font-telemetry text-[10px] text-zinc-400">
                          {team.name} • {driver.racesCount || 0} Races
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="font-telemetry text-xs font-bold text-[#00d2be]">
                          {category === 'bestWPM'
                            ? `${driver.bestWPM || 0} WPM`
                            : category === 'avgWPM'
                            ? `${driver.avgWPM || 0} WPM`
                            : `${driver.racesWon || 0} WINS`}
                        </span>
                        <span className="font-telemetry text-[9px] text-zinc-500">
                          ACCURACY: {driver.avgAccuracy || 100}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
