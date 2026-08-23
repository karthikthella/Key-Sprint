import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, Trophy, User, Zap, ShieldCheck, Flag, Wrench } from 'lucide-react';
import { soundEngine } from '../theme/f1Constants';
import { useAuth } from '../context/AuthContext';

export default function F1Navbar({ onOpenAuth }) {
  const { user } = useAuth();
  const [soundOn, setSoundOn] = useState(true);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundEngine.enabled = next;
    if (next) soundEngine.playLightBeep();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#252532] bg-[#0c0d14]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        
        {/* Brand Logo & Title (Navigates to /) */}
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center bg-[#e10600] px-3 font-f1 text-xl tracking-tighter text-white skew-f1 shadow-[0_0_15px_rgba(225,6,0,0.5)]">
              <span className="unskew-f1">F1</span>
            </div>
            <div className="flex flex-col">
              <span className="font-f1 text-lg leading-tight tracking-wider text-white">
                KEY<span className="text-[#e10600]">-</span>SPRINT
              </span>
              <span className="font-telemetry text-[9px] tracking-[0.2em] text-zinc-400">
                2026 WORLD CHAMPIONSHIP
              </span>
            </div>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Paddock Lobby */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-md px-3 py-1.5 font-f1 text-xs tracking-wider transition-colors ${
                isActive
                  ? 'bg-[#e10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.4)]'
                  : 'text-zinc-400 hover:bg-[#161724] hover:text-white'
              }`
            }
          >
            <Flag className="h-3.5 w-3.5" />
            <span>PADDOCK</span>
          </NavLink>

          {/* Championship Standings */}
          <NavLink
            to="/standings"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-md px-3 py-1.5 font-f1 text-xs tracking-wider transition-colors ${
                isActive
                  ? 'bg-[#e10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.4)]'
                  : 'text-zinc-400 hover:bg-[#161724] hover:text-white'
              }`
            }
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>STANDINGS</span>
          </NavLink>

          {/* Garage & Driver Stats */}
          <NavLink
            to="/garage"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-md px-3 py-1.5 font-f1 text-xs tracking-wider transition-colors ${
                isActive
                  ? 'bg-[#e10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.4)]'
                  : 'text-zinc-400 hover:bg-[#161724] hover:text-white'
              }`
            }
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>GARAGE</span>
          </NavLink>
        </nav>

        {/* Right Actions: Sound, Driver Profile / Superlicence */}
        <div className="flex items-center gap-2">
          {/* Audio FX Toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#252532] bg-[#161723] text-zinc-300 transition-colors hover:border-[#e10600] hover:text-white"
          >
            {soundOn ? <Volume2 className="h-4 w-4 text-[#00d2be]" /> : <VolumeX className="h-4 w-4 text-zinc-500" />}
          </button>

          {/* User Account / Driver Licence */}
          {user ? (
            <Link
              to="/garage"
              className="flex items-center gap-2 rounded-md border border-[#252532] bg-[#161723] px-3 py-1 transition-colors hover:border-[#00d2be]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#e10600] font-f1 text-xs text-white">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-telemetry text-xs font-bold leading-none text-white">
                  {user.username}
                </span>
                <span className="font-telemetry text-[9px] text-[#00d2be]">
                  BEST: {user.bestWPM || 0} WPM
                </span>
              </div>
            </Link>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-md bg-[#e10600] px-3 py-1.5 font-f1 text-xs tracking-wider text-white shadow-[0_0_10px_rgba(225,6,0,0.4)] transition-transform hover:scale-105"
            >
              <User className="h-3.5 w-3.5" />
              <span>DRIVER LOGIN</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
