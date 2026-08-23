import React, { useState } from 'react';
import axios from 'axios';
import { X, User, Key, Mail, ShieldAlert, Check } from 'lucide-react';
import { TEAM_LIST } from '../theme/f1Constants';

export default function F1AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('redbull');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? 'register' : 'login';
    const payload = isRegister
      ? { username: username.trim(), email: email.trim(), password, avatar: selectedTeam }
      : { username: username.trim(), password };

    try {
      const res = await axios.post(`http://localhost:5000/api/auth/${endpoint}`, payload);
      const { user, token } = res.data;
      localStorage.setItem('keysprint_token', token);
      onAuthSuccess(user, token);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#303248] bg-[#0c0d15] p-6 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-[#2e3044] bg-[#1a1b2a] text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-[#e10600] px-2.5 py-1 font-f1 text-lg text-white skew-f1 shadow-[0_0_15px_rgba(225,6,0,0.5)]">
            <span className="unskew-f1">FIA</span>
          </div>
          <div>
            <h2 className="font-f1 text-xl tracking-wider text-white">
              {isRegister ? 'DRIVER SUPERLICENCE' : 'OFFICIAL DRIVER LOGIN'}
            </h2>
            <p className="font-telemetry text-xs text-zinc-400">
              {isRegister ? 'Register your racing profile' : 'Sign in to record your championship stats'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-5 flex rounded-lg border border-[#252636] bg-[#12131d] p-1">
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 rounded-md py-1.5 font-f1 text-xs tracking-wider transition-colors ${
              isRegister ? 'bg-[#e10600] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            NEW DRIVER
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 rounded-md py-1.5 font-f1 text-xs tracking-wider transition-colors ${
              !isRegister ? 'bg-[#e10600] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            EXISTING DRIVER
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#e10600] bg-[#e10600]/10 p-3 font-telemetry text-xs text-[#ff6b6b]">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Driver Callsign / Username */}
          <div className="flex flex-col gap-1">
            <label className="font-telemetry text-[11px] font-bold text-zinc-400">DRIVER CALLSIGN (USERNAME)</label>
            <div className="flex items-center rounded-lg border border-[#252636] bg-[#141522] px-3 py-2 focus-within:border-[#00d2be]">
              <User className="mr-2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Verstappen, Hamilton"
                className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Email (Only for registration) */}
          {isRegister && (
            <div className="flex flex-col gap-1">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">PIT WALL EMAIL (OPTIONAL)</label>
              <div className="flex items-center rounded-lg border border-[#252636] bg-[#141522] px-3 py-2 focus-within:border-[#00d2be]">
                <Mail className="mr-2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@keysprint.f1"
                  className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="font-telemetry text-[11px] font-bold text-zinc-400">TELEMETRY ACCESS PIN (PASSWORD)</label>
            <div className="flex items-center rounded-lg border border-[#252636] bg-[#141522] px-3 py-2 focus-within:border-[#00d2be]">
              <Key className="mr-2 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Team Livery Selection (Register only) */}
          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">SELECT CONSTRUCTOR / TEAM</label>
              <div className="grid grid-cols-5 gap-2">
                {TEAM_LIST.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeam(team.id)}
                    className={`flex flex-col items-center justify-center rounded-lg border p-2 transition-all ${
                      selectedTeam === team.id
                        ? 'border-[#00d2be] bg-[#1a1c2b] shadow-[0_0_10px_rgba(0,210,190,0.3)]'
                        : 'border-[#202130] bg-[#12131d] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <span className="mt-1 font-telemetry text-[9px] font-bold text-white">
                      {team.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center rounded-lg bg-[#e10600] py-3 font-f1 text-sm tracking-wider text-white shadow-[0_0_20px_rgba(225,6,0,0.5)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'TRANSMITTING TELEMETRY...' : isRegister ? 'ISSUE SUPERLICENCE' : 'AUTHENTICATE & ENTER PADDOCK'}
          </button>

        </form>

      </div>
    </div>
  );
}
