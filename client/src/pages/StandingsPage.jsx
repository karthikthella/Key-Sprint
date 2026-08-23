import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Award, Flame, Zap, ShieldCheck } from 'lucide-react';
import { getTeamByIndex } from '../theme/f1Constants';

export default function StandingsPage() {
  const [category, setCategory] = useState('bestWPM');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:5000/api/users/leaderboard/top?category=${category}&limit=25`
        );
        setDrivers(res.data.leaderboard || []);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [category]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-4">
      
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#252532] bg-[#12131d] p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="bg-[#e10600] px-3 py-1 font-f1 text-lg text-white skew-f1 shadow-[0_0_15px_rgba(225,6,0,0.5)]">
            <span className="unskew-f1">FIA</span>
          </div>
          <div>
            <h1 className="font-f1 text-2xl tracking-wider text-white">
              WORLD DRIVERS' CHAMPIONSHIP
            </h1>
            <p className="font-telemetry text-xs text-zinc-400">
              OFFICIAL 2026 SEASON TELEMETRY & STANDINGS
            </p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex rounded-xl border border-[#252636] bg-[#0e0f18] p-1.5">
        <button
          onClick={() => setCategory('bestWPM')}
          className={`flex-1 rounded-lg py-2.5 font-f1 text-xs tracking-wider transition-colors ${
            category === 'bestWPM'
              ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.5)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          🟣 FASTEST LAP (PEAK WPM)
        </button>
        <button
          onClick={() => setCategory('avgWPM')}
          className={`flex-1 rounded-lg py-2.5 font-f1 text-xs tracking-wider transition-colors ${
            category === 'avgWPM'
              ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.5)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          🟢 RACE PACE (AVG WPM)
        </button>
        <button
          onClick={() => setCategory('racesWon')}
          className={`flex-1 rounded-lg py-2.5 font-f1 text-xs tracking-wider transition-colors ${
            category === 'racesWon'
              ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.5)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          🏆 GRAND PRIX VICTORIES
        </button>
      </div>

      {/* Standings List */}
      <div className="flex flex-col gap-2 rounded-2xl border border-[#252532] bg-[#0c0d15] p-4 shadow-xl">
        {loading ? (
          <div className="p-12 text-center font-telemetry text-sm text-zinc-500">
            Downloading telemetry data from FIA paddock servers...
          </div>
        ) : drivers.length === 0 ? (
          <div className="p-12 text-center font-telemetry text-sm text-zinc-500">
            No official championship race records found.
          </div>
        ) : (
          drivers.map((driver, idx) => {
            const pos = idx + 1;
            const team = getTeamByIndex(idx);

            return (
              <div
                key={driver._id || idx}
                className="relative flex items-center justify-between overflow-hidden rounded-xl border border-[#202130] bg-[#12131d] p-3.5 transition-colors hover:border-[#35374d]"
              >
                {/* Team Livery Vertical Stripe */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: team.primaryColor }}
                />

                <div className="flex items-center gap-3.5 pl-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-md font-f1 text-sm ${
                      pos === 1
                        ? 'bg-[#ffd700] text-black font-black shadow-[0_0_10px_#ffd700]'
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
                    <span className="font-f1 text-base text-white">
                      {driver.username}
                    </span>
                    <span className="font-telemetry text-xs text-zinc-400">
                      {team.name} • {driver.racesCount || 0} Grand Prix Races
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="font-telemetry text-sm font-bold text-[#00d2be]">
                      {category === 'bestWPM'
                        ? `${driver.bestWPM || 0} WPM`
                        : category === 'avgWPM'
                        ? `${driver.avgWPM || 0} WPM`
                        : `${driver.racesWon || 0} WINS`}
                    </span>
                    <span className="font-telemetry text-[10px] text-zinc-500">
                      ACCURACY: {driver.avgAccuracy || 100}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
