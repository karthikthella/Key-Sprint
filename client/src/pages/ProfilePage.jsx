import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Trophy, Zap, Gauge, Award, LogOut, ShieldCheck, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TEAM_LIST, F1_TEAMS } from '../theme/f1Constants';

export default function ProfilePage({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#252532] bg-[#141522] text-[#e10600]">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-f1 text-2xl text-white">NO SUPERLICENCE FOUND</h2>
        <p className="mt-1 font-telemetry text-sm text-zinc-400">
          Sign in or register to record your official championship telemetry.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-6 rounded-lg bg-[#e10600] px-6 py-2.5 font-f1 text-sm tracking-wider text-white shadow-[0_0_20px_rgba(225,6,0,0.5)] transition-transform hover:scale-105"
        >
          AUTHENTICATE DRIVER
        </button>
      </div>
    );
  }

  const selectedTeam = F1_TEAMS[user.avatar] || F1_TEAMS.redbull;
  const winRate = user.racesCount > 0 ? Math.round((user.racesWon / user.racesCount) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-4">
      
      {/* Driver Superlicence ID Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#303248] bg-[#12131d] p-6 shadow-2xl">
        {/* Background team glow */}
        <div
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: selectedTeam.primaryColor }}
        />

        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl font-f1 text-3xl font-black text-white shadow-xl"
              style={{ backgroundColor: selectedTeam.primaryColor }}
            >
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="bg-[#e10600] px-2 py-0.5 font-f1 text-xs text-white skew-f1">
                  <span className="unskew-f1">FIA SUPERLICENCE</span>
                </span>
                <span className="font-telemetry text-xs text-zinc-400">CLASS A DRIVER</span>
              </div>
              <h1 className="font-f1 text-3xl text-white sm:text-4xl">{user.username}</h1>
              <span className="font-telemetry text-sm text-[#00d2be]">{selectedTeam.name}</span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-2 rounded-lg border border-[#2e3042] bg-[#181928] px-4 py-2 font-telemetry text-xs font-bold text-zinc-400 transition-colors hover:border-[#e10600] hover:text-white"
          >
            <LogOut className="h-4 w-4 text-[#e10600]" />
            <span>SIGN OUT</span>
          </button>
        </div>
      </div>

      {/* Career Telemetry Metric Dials */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        
        {/* Best WPM */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#252532] bg-[#0c0d15] p-4 text-center">
          <span className="font-telemetry text-xs text-zinc-500">PEAK SPEED</span>
          <span className="font-f1 text-3xl font-black text-[#00d2be] sm:text-4xl">
            {user.bestWPM || 0}
          </span>
          <span className="font-telemetry text-[10px] text-zinc-400">WORDS PER MINUTE</span>
        </div>

        {/* Avg WPM */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#252532] bg-[#0c0d15] p-4 text-center">
          <span className="font-telemetry text-xs text-zinc-500">RACE PACE</span>
          <span className="font-f1 text-3xl font-black text-white sm:text-4xl">
            {user.avgWPM || 0}
          </span>
          <span className="font-telemetry text-[10px] text-zinc-400">AVG WPM</span>
        </div>

        {/* Races Won */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#252532] bg-[#0c0d15] p-4 text-center">
          <span className="font-telemetry text-xs text-zinc-500">VICTORIES</span>
          <span className="font-f1 text-3xl font-black text-[#ffd700] sm:text-4xl">
            {user.racesWon || 0}
          </span>
          <span className="font-telemetry text-[10px] text-zinc-400">WINS / {user.racesCount || 0} GPS</span>
        </div>

        {/* Career Accuracy */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#252532] bg-[#0c0d15] p-4 text-center">
          <span className="font-telemetry text-xs text-zinc-500">ACCURACY</span>
          <span className="font-f1 text-3xl font-black text-[#3fb950] sm:text-4xl">
            {user.avgAccuracy || 100}%
          </span>
          <span className="font-telemetry text-[10px] text-zinc-400">WIN RATE: {winRate}%</span>
        </div>

      </div>

    </div>
  );
}
