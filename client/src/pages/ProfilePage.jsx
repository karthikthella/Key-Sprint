import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Zap,
  Gauge,
  LogOut,
  ShieldCheck,
  Flag,
  Flame,
  CheckCircle,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
  Award,
  BarChart3,
  X,
  FileText,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundEngine } from '../theme/f1Constants';

// Import Generated 3D F1 Badges
import badgeGpWinner from '../assets/badges/grand_prix_winner.jpg';
import badgeSpeedTrap from '../assets/badges/speed_trap_king.jpg';
import badgeUntouchable from '../assets/badges/untouchable.jpg';
import badgePurpleReign from '../assets/badges/purple_reign.jpg';
import badgeHatTrick from '../assets/badges/hat_trick_hero.jpg';
import badgeGrandChelem from '../assets/badges/grand_chelem.jpg';
import badgeFlawless from '../assets/badges/flawless_stint.jpg';
import badgePrecision from '../assets/badges/precision_engineer.jpg';
import badgeVeteran from '../assets/badges/paddock_veteran.jpg';

const BADGE_IMAGE_MAP = {
  'grand_prix_winner.jpg': badgeGpWinner,
  'speed_trap_king.jpg': badgeSpeedTrap,
  'untouchable.jpg': badgeUntouchable,
  'purple_reign.jpg': badgePurpleReign,
  'hat_trick_hero.jpg': badgeHatTrick,
  'grand_chelem.jpg': badgeGrandChelem,
  'flawless_stint.jpg': badgeFlawless,
  'precision_engineer.jpg': badgePrecision,
  'paddock_veteran.jpg': badgeVeteran
};

const DEFAULT_CONSTRUCTORS = [
  { id: 'mclaren', name: 'McLaren Formula 1 Team', shortName: 'MCL', primaryColor: '#FF8000', engine: 'Mercedes-AMG', base: 'Woking, UK' },
  { id: 'ferrari', name: 'Scuderia Ferrari HP', shortName: 'FER', primaryColor: '#E8002D', engine: 'Ferrari Works', base: 'Maranello, Italy' },
  { id: 'redbull', name: 'Oracle Red Bull Racing', shortName: 'RBR', primaryColor: '#3671C6', engine: 'Red Bull-Ford', base: 'Milton Keynes, UK' },
  { id: 'mercedes', name: 'Mercedes-AMG PETRONAS', shortName: 'MER', primaryColor: '#27F4D2', engine: 'Mercedes Works', base: 'Brackley, UK' },
  { id: 'astonmartin', name: 'Aston Martin Aramco F1 Team', shortName: 'AST', primaryColor: '#229971', engine: 'Honda Works', base: 'Silverstone, UK' },
  { id: 'audi', name: 'Audi F1 Team', shortName: 'AUD', primaryColor: '#F1001E', engine: 'Audi Works Power Unit', base: 'Neuburg, Germany' },
  { id: 'cadillac', name: 'Cadillac Formula 1 Team', shortName: 'CAD', primaryColor: '#D4AF37', engine: 'Ferrari Customer Unit', base: 'Fishers, USA' },
  { id: 'alpine', name: 'BWT Alpine F1 Team', shortName: 'ALP', primaryColor: '#0093CC', engine: 'Mercedes-AMG', base: 'Enstone, UK' },
  { id: 'rb', name: 'Visa Cash App RB', shortName: 'VRB', primaryColor: '#6692FF', engine: 'Red Bull-Ford', base: 'Faenza, Italy' },
  { id: 'williams', name: 'Williams Racing', shortName: 'WIL', primaryColor: '#64C4FF', engine: 'Mercedes-AMG', base: 'Grove, UK' },
  { id: 'haas', name: 'MoneyGram Haas F1 Team', shortName: 'HAS', primaryColor: '#B6BABD', engine: 'Ferrari / Toyota Technical', base: 'Kannapolis, USA' }
];

export default function ProfilePage({ onOpenAuth }) {
  const { user, token, logout, setUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('garage'); // garage | analytics | trophies | history
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // all | multiplayer | practice
  const [selectedBadge, setSelectedBadge] = useState(null);
  
  // Contract Confirmation Modal State
  const [pendingTeam, setPendingTeam] = useState(null);
  const [contractSuccessMsg, setContractSuccessMsg] = useState('');

  // Fetch complete telemetry, superlicence, badges, and analytics from backend
  const fetchProfileData = () => {
    if (!user?._id && !user?.id) return;
    const uid = user._id || user.id;

    setLoading(true);
    axios
      .get(`http://localhost:5000/api/users/${uid}/stats`)
      .then((res) => {
        setProfileData(res.data);
      })
      .catch((err) => {
        console.error('Failed to load profile telemetry:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const allConstructors = (profileData?.contract?.allConstructors?.length > 0)
    ? profileData.contract.allConstructors
    : DEFAULT_CONSTRUCTORS;

  const currentContract = profileData?.contract?.team || (
    allConstructors.find((t) => t.id === (user?.avatar || 'redbull')) || allConstructors[0]
  );

  const superlicence = profileData?.superlicence || {
    grade: 'CLASS A',
    title: 'FORMULA 1 GRAND PRIX DRIVER',
    color: '#e10600',
    description: 'Official Formula 1 Grand Prix Winner pace.',
    licenseNumber: `FIA-${user?._id?.slice(-6).toUpperCase() || user?.id?.slice(-6).toUpperCase() || '2026'}`
  };

  const disciplineStats = profileData?.disciplineStats || {
    multiplayer: { racesCount: 0, racesWon: 0, podiums: 0, championshipPoints: 0, winRatePercent: 0 },
    practice: { sessionsCount: 0, bestWPM: 0, totalWordsTyped: 0 }
  };
  const badges = profileData?.badges || [];
  const speedTrend = profileData?.speedTrend || [];
  const universeMatrix = profileData?.universeMatrix || [];
  const recentRaces = profileData?.recentRaces || [];

  // Filtered History
  const filteredHistory = recentRaces.filter((r) => {
    if (historyFilter === 'multiplayer') return r.mode === 'multiplayer';
    if (historyFilter === 'practice') return r.mode === 'practice';
    return true;
  });

  // SVG Chart Geometry Calculation (Unconditional Hook at Top)
  const chartPoints = useMemo(() => {
    if (!speedTrend || speedTrend.length === 0) return null;
    const width = 680;
    const height = 180;
    const padding = 30;

    const wpms = speedTrend.map((p) => p.wpm);
    const minWpm = Math.max(0, Math.min(...wpms) - 10);
    const maxWpm = Math.max(...wpms, minWpm + 30);

    const stepX = speedTrend.length > 1 ? (width - padding * 2) / (speedTrend.length - 1) : 0;

    const points = speedTrend.map((p, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((p.wpm - minWpm) / (maxWpm - minWpm || 1)) * (height - padding * 2);
      return { x, y, ...p };
    });

    const pathD = points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cpX1 = prev.x + (p.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (p.x - prev.x) / 2;
      const cpY2 = p.y;
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { points, pathD, areaD, width, height, minWpm, maxWpm };
  }, [speedTrend]);

  // Open Confirmation Popup
  const handleInitiateContractSigning = (team) => {
    if (team.id === currentContract.id) return;
    setPendingTeam(team);
  };

  // Confirm Contract Signing via API
  const handleConfirmContractSigning = async () => {
    if (!pendingTeam || updatingTeam) return;
    setUpdatingTeam(true);

    try {
      soundEngine.playRaceStart();
      const res = await axios.patch(
        'http://localhost:5000/api/users/profile',
        { avatar: pendingTeam.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.ok) {
        setUser(res.data.user);
        setContractSuccessMsg(`CONTRACT SIGNED! Welcome to ${pendingTeam.name}! 🏎️💨`);
        setTimeout(() => setContractSuccessMsg(''), 4500);
        fetchProfileData();
      }
    } catch (err) {
      console.error('Failed to sign constructor contract:', err);
    } finally {
      setUpdatingTeam(false);
      setPendingTeam(null);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center py-28 text-center font-telemetry">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00d2be] border-t-transparent" />
        <span className="mt-4 text-xs font-bold text-zinc-400">CONNECTING TO FIA PADDOCK TELEMETRY...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#252532] bg-[#141522] text-[#e10600] shadow-[0_0_30px_rgba(225,6,0,0.3)]">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <h2 className="mt-5 font-f1 text-3xl text-white">NO SUPERLICENCE DETECTED</h2>
        <p className="mt-2 font-telemetry text-sm text-zinc-400">
          Sign in or register your FIA Superlicence to record your official championship stats, telemetry, and constructor contracts.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-6 rounded-xl bg-[#e10600] px-8 py-3 font-f1 text-sm tracking-wider text-white shadow-[0_0_25px_rgba(225,6,0,0.5)] transition-transform hover:scale-105"
        >
          AUTHENTICATE DRIVER
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2">

      {/* Success Notification Banner */}
      <AnimatePresence>
        {contractSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex items-center gap-3 rounded-xl border border-[#00d2be] bg-[#00d2be]/15 p-4 font-f1 text-sm text-[#00d2be] shadow-[0_0_25px_rgba(0,210,190,0.3)]"
          >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{contractSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOP SECTION: OFFICIAL FIA SUPERLICENCE ID PASS CARD --- */}
      <div className="relative overflow-hidden rounded-2xl border border-[#2d2f44] bg-[#0d0e17] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.9)] sm:p-8">
        
        {/* Dynamic Constructor Livery Ambient Glow */}
        <div
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl transition-colors duration-700"
          style={{ backgroundColor: currentContract.primaryColor }}
        />

        {/* Watermark FIA Hologram */}
        <div className="pointer-events-none absolute right-6 bottom-4 select-none font-f1 text-8xl font-black text-white/3">
          FIA
        </div>

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          
          {/* Driver Avatar & Details */}
          <div className="flex items-center gap-5">
            {/* Monogram Box with Team Livery Accent */}
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl font-f1 text-4xl font-black text-white shadow-2xl transition-colors duration-300"
              style={{ backgroundColor: currentContract.primaryColor }}
            >
              {user.username.slice(0, 1).toUpperCase()}
            </div>

            <div className="flex flex-col">
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded border px-2.5 py-0.5 font-f1 text-xs tracking-wider"
                  style={{
                    backgroundColor: `${superlicence.color}20`,
                    borderColor: superlicence.color,
                    color: superlicence.color
                  }}
                >
                  {superlicence.grade} • {superlicence.title}
                </span>
                <span className="rounded border border-[#2e3048] bg-[#161724] px-2 py-0.5 font-telemetry text-[10px] text-zinc-400">
                  {superlicence.licenseNumber}
                </span>
              </div>

              {/* Driver Name & Number */}
              <div className="mt-1 flex items-baseline gap-3">
                <h1 className="font-f1 text-3xl font-bold tracking-wider text-white sm:text-4xl">
                  {user.username}
                </h1>
                <span className="font-f1 text-xl font-bold text-zinc-500">
                  #{user.driverNumber || 1}
                </span>
              </div>

              {/* Active Team Contract */}
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px]"
                  style={{ backgroundColor: currentContract.primaryColor }}
                />
                <span className="font-telemetry text-sm font-bold text-zinc-200">
                  {currentContract.name}
                </span>
                <span className="font-telemetry text-xs text-zinc-500">
                  • {currentContract.engine}
                </span>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#2e3042] bg-[#141522] px-4 py-2.5 font-telemetry text-xs font-bold text-zinc-400 transition-colors hover:border-[#e10600] hover:text-white"
          >
            <LogOut className="h-4 w-4 text-[#e10600]" />
            <span>REVOKE LICENSE (LOGOUT)</span>
          </button>

        </div>

      </div>

      {/* --- CORE TELEMETRY GAUGES (4-BOX GRID) --- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Peak Speed */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#252532] bg-[#0e0f17] p-4 text-center">
          <span className="font-telemetry text-[11px] tracking-wider text-zinc-500">PEAK SPEED</span>
          <span className="font-f1 text-3xl font-black text-[#00d2be] sm:text-4xl">
            {user.bestWPM || 0}
          </span>
          <span className="font-telemetry text-[10px] text-zinc-400">FASTEST LAP (WPM)</span>
        </div>

        {/* Race Pace (Avg WPM) */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#252532] bg-[#0e0f17] p-4 text-center">
          <span className="font-telemetry text-[11px] tracking-wider text-zinc-500">RACE PACE</span>
          <span className="font-f1 text-3xl font-black text-white sm:text-4xl">
            {user.avgWPM || 0}
          </span>
          <span className="font-telemetry text-[10px] text-zinc-400">CAREER AVERAGE WPM</span>
        </div>

        {/* Grand Prix Victories */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#252532] bg-[#0e0f17] p-4 text-center">
          <span className="font-telemetry text-[11px] tracking-wider text-zinc-500">GP VICTORIES</span>
          <span className="font-f1 text-3xl font-black text-[#ffd700] sm:text-4xl">
            {disciplineStats.multiplayer.racesWon}
          </span>
          <span className="font-telemetry text-[10px] text-zinc-400">
            {disciplineStats.multiplayer.winRatePercent}% WIN RATE ({disciplineStats.multiplayer.racesCount} GPS)
          </span>
        </div>

        {/* Throttle Accuracy */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#252532] bg-[#0e0f17] p-4 text-center">
          <span className="font-telemetry text-[11px] tracking-wider text-zinc-500">THROTTLE ACCURACY</span>
          <span className="font-f1 text-3xl font-black text-[#3fb950] sm:text-4xl">
            {user.avgAccuracy || 100}%
          </span>
          <span className="font-telemetry text-[10px] text-zinc-400">
            {user.totalKeystrokes || 0} KEYSTROKES
          </span>
        </div>
      </div>

      {/* --- HUB NAVIGATION TABS --- */}
      <div className="flex rounded-xl border border-[#252532] bg-[#0e0f17] p-1.5 font-f1 text-xs">
        <button
          onClick={() => setActiveTab('garage')}
          className={`flex-1 rounded-lg py-2.5 tracking-wider transition-colors ${
            activeTab === 'garage'
              ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.5)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          🏎️ 2026 CONSTRUCTOR GARAGE
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 rounded-lg py-2.5 tracking-wider transition-colors ${
            activeTab === 'analytics'
              ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.5)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          📊 TELEMETRY ANALYTICS
        </button>
        <button
          onClick={() => setActiveTab('trophies')}
          className={`flex-1 rounded-lg py-2.5 tracking-wider transition-colors ${
            activeTab === 'trophies'
              ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.5)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          🏆 TROPHY CABINET ({badges.filter((b) => b.unlocked).length}/{badges.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 rounded-lg py-2.5 tracking-wider transition-colors ${
            activeTab === 'history'
              ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.5)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          ⏱️ RECENT TELEMETRY LOG
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 🏎️ 2026 CONSTRUCTOR GARAGE (11 TEAMS)                              */}
      {/* ========================================================================= */}
      {activeTab === 'garage' && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[#252532] bg-[#0c0d14] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-f1 text-lg text-white">2026 OFFICIAL CONSTRUCTOR GRID</h3>
              <p className="font-telemetry text-xs text-zinc-400">
                Select an official Formula 1 constructor below to sign a contract and update your race livery.
              </p>
            </div>
            <span className="rounded bg-[#141524] px-3 py-1 font-telemetry text-xs text-zinc-400">
              11 TEAMS AVAILABLE
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allConstructors.map((team) => {
              const isSelected = currentContract.id === team.id;

              return (
                <div
                  key={team.id}
                  onClick={() => handleInitiateContractSigning(team)}
                  className={`group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-[#00d2be] bg-[#161728] shadow-[0_0_25px_rgba(0,210,190,0.25)]'
                      : 'border-[#20212f] bg-[#11121c] hover:scale-[1.02] hover:border-[#404360] hover:bg-[#151624]'
                  }`}
                >
                  {/* Left Constructor Color Stripe */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 transition-transform duration-200 group-hover:w-3"
                    style={{ backgroundColor: team.primaryColor }}
                  />

                  <div className="flex items-center gap-3.5 pl-2">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl font-f1 text-sm font-black text-white shadow-lg transition-transform group-hover:scale-105"
                      style={{ backgroundColor: team.primaryColor }}
                    >
                      {team.shortName}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-f1 text-sm text-white group-hover:text-[#00d2be]">
                        {team.name}
                      </span>
                      <span className="font-telemetry text-[11px] text-zinc-400">
                        {team.engine}
                      </span>
                      <span className="font-telemetry text-[10px] text-zinc-500">
                        {team.base || 'Factory Works'}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isSelected ? (
                      <div className="flex items-center gap-1 rounded bg-[#00d2be]/20 px-2.5 py-1 font-telemetry text-[10px] font-bold text-[#00d2be]">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>ACTIVE</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="rounded border border-[#2d2f44] bg-[#1a1b2a] px-3 py-1 font-f1 text-[11px] text-zinc-300 transition-colors group-hover:border-[#00d2be] group-hover:bg-[#00d2be] group-hover:text-black"
                      >
                        SIGN
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 📊 TELEMETRY ANALYTICS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="flex flex-col gap-6">
          
          {/* Speed Progression Curve Chart */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#252532] bg-[#0c0d14] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-f1 text-lg text-white">SPEED PROGRESSION CURVE</h3>
                <p className="font-telemetry text-xs text-zinc-400">
                  Chronological WPM telemetry across your recent competitive races.
                </p>
              </div>
              <div className="flex items-center gap-2 font-telemetry text-xs text-[#00d2be]">
                <Activity className="h-4 w-4" />
                <span>LIVE TELEMETRY</span>
              </div>
            </div>

            {chartPoints ? (
              <div className="relative mt-2 w-full overflow-hidden rounded-xl border border-[#1e1f2b] bg-[#090a0f] p-4">
                <svg
                  viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
                  className="h-48 w-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="speedCurveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d2be" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#00d2be" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="30" y1="30" x2="650" y2="30" stroke="#1f202e" strokeDasharray="4 4" />
                  <line x1="30" y1="90" x2="650" y2="90" stroke="#1f202e" strokeDasharray="4 4" />
                  <line x1="30" y1="150" x2="650" y2="150" stroke="#1f202e" />

                  {/* Area fill */}
                  <path d={chartPoints.areaD} fill="url(#speedCurveGrad)" />

                  {/* Spline curve line */}
                  <path
                    d={chartPoints.pathD}
                    fill="none"
                    stroke="#00d2be"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Data Points */}
                  {chartPoints.points.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        className="fill-[#090a0f] stroke-[#00d2be] stroke-[2.5] transition-all hover:r-7 hover:fill-[#00d2be]"
                      />
                      <text
                        x={p.x}
                        y={p.y - 10}
                        textAnchor="middle"
                        className="fill-zinc-300 font-telemetry text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        {p.wpm} WPM
                      </text>
                    </g>
                  ))}
                </svg>

                <div className="mt-2 flex items-center justify-between border-t border-[#1a1b26] pt-2 font-telemetry text-[11px] text-zinc-500">
                  <span>OLDEST RACE RECORD</span>
                  <span>LATEST RACE TELEMETRY</span>
                </div>
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center rounded-xl border border-[#1e1f2b] bg-[#090a0f] font-telemetry text-xs text-zinc-500">
                Complete at least 1 race to plot your speed progression curve.
              </div>
            )}
          </div>

          {/* Discipline Breakdown: Multiplayer GP vs Solo Practice */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            
            {/* Multiplayer GP Card */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#252532] bg-[#0c0d14] p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1f202d] pb-3">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-[#ffd700]" />
                  <h4 className="font-f1 text-base text-white">OFFICIAL MULTIPLAYER GP</h4>
                </div>
                <span className="rounded bg-[#ffd700]/15 px-2 py-0.5 font-telemetry text-[10px] font-bold text-[#ffd700]">
                  COMPETITIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col">
                  <span className="font-telemetry text-xs text-zinc-500">TOTAL GP STARTS</span>
                  <span className="font-f1 text-2xl text-white">
                    {disciplineStats.multiplayer.racesCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-telemetry text-xs text-zinc-500">P1 VICTORIES</span>
                  <span className="font-f1 text-2xl text-[#ffd700]">
                    {disciplineStats.multiplayer.racesWon}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-telemetry text-xs text-zinc-500">PODIUM FINISHES</span>
                  <span className="font-f1 text-2xl text-[#00d2be]">
                    {disciplineStats.multiplayer.podiums}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-telemetry text-xs text-zinc-500">CHAMPIONSHIP POINTS</span>
                  <span className="font-f1 text-2xl text-[#a855f7]">
                    {disciplineStats.multiplayer.championshipPoints} PTS
                  </span>
                </div>
              </div>
            </div>

            {/* Solo Practice Card */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#252532] bg-[#0c0d14] p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1f202d] pb-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-[#00d2be]" />
                  <h4 className="font-f1 text-base text-white">PRACTICE & SIMULATOR</h4>
                </div>
                <span className="rounded bg-[#00d2be]/15 px-2 py-0.5 font-telemetry text-[10px] font-bold text-[#00d2be]">
                  TRAINING
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col">
                  <span className="font-telemetry text-xs text-zinc-500">PRACTICE SESSIONS</span>
                  <span className="font-f1 text-2xl text-white">
                    {disciplineStats.practice.sessionsCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-telemetry text-xs text-zinc-500">PEAK PRACTICE WPM</span>
                  <span className="font-f1 text-2xl text-[#00d2be]">
                    {disciplineStats.practice.bestWPM}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-telemetry text-xs text-zinc-500">TOTAL WORDS TYPED</span>
                  <span className="font-f1 text-2xl text-zinc-300">
                    {disciplineStats.practice.totalWordsTyped}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-telemetry text-xs text-zinc-500">TOTAL SECTORS RUN</span>
                  <span className="font-f1 text-2xl text-zinc-300">
                    {disciplineStats.practice.sessionsCount * 3}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Universe Speed Matrix */}
          {universeMatrix.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#252532] bg-[#0c0d14] p-5 shadow-xl">
              <div>
                <h4 className="font-f1 text-base text-white">UNIVERSE SPEED MATRIX</h4>
                <p className="font-telemetry text-xs text-zinc-400">
                  Your throttle pace categorized across different quote disciplines.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {universeMatrix.map((u) => (
                  <div
                    key={u.universe}
                    className="flex flex-col rounded-xl border border-[#1f202e] bg-[#12131d] p-3"
                  >
                    <span className="font-f1 text-xs uppercase text-[#00d2be]">
                      {u.universe}
                    </span>
                    <span className="font-f1 text-xl font-bold text-white">
                      {u.avgWpm} <span className="text-xs font-normal text-zinc-400">AVG WPM</span>
                    </span>
                    <span className="font-telemetry text-[10px] text-zinc-500">
                      Peak: {u.bestWpm} WPM • {u.racesCount} Races
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 🏆 TROPHY CABINET & BADGES                                         */}
      {/* ========================================================================= */}
      {activeTab === 'trophies' && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[#252532] bg-[#0c0d14] p-5 shadow-xl">
          <div>
            <h3 className="font-f1 text-lg text-white">FIA CAREER TROPHY CABINET</h3>
            <p className="font-telemetry text-xs text-zinc-400">
              Official Formula 1 esports accolades unlocked through competitive Grand Prix racing.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => {
              const badgeImage = BADGE_IMAGE_MAP[badge.assetName] || badgeGpWinner;

              return (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className={`group relative flex cursor-pointer items-center gap-3.5 overflow-hidden rounded-xl border p-3.5 transition-all ${
                    badge.unlocked
                      ? 'border-[#ffd700]/40 bg-[#141524] shadow-[0_0_20px_rgba(255,215,0,0.15)] hover:border-[#ffd700]'
                      : 'border-[#1f202d] bg-[#0f1017] opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Badge 3D Image Asset */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/40 p-1 shadow-inner">
                    <img
                      src={badgeImage}
                      alt={badge.name}
                      className={`h-full w-full object-cover transition-transform group-hover:scale-110 ${
                        badge.unlocked ? 'drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]' : 'grayscale opacity-50'
                      }`}
                    />
                    {!badge.unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Lock className="h-5 w-5 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  {/* Badge Info */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between">
                      <span className="font-telemetry text-[10px] uppercase text-[#00d2be]">
                        {badge.category}
                      </span>
                      {badge.unlocked && (
                        <span className="flex items-center gap-0.5 font-telemetry text-[10px] font-bold text-[#ffd700]">
                          <Sparkles className="h-3 w-3" />
                          UNLOCKED
                        </span>
                      )}
                    </div>

                    <span
                      className={`font-f1 text-sm font-bold ${
                        badge.unlocked ? 'text-white' : 'text-zinc-400'
                      }`}
                    >
                      {badge.name}
                    </span>

                    <span className="line-clamp-2 font-telemetry text-[11px] text-zinc-400">
                      {badge.description}
                    </span>

                    {/* Progress Bar if not unlocked */}
                    {!badge.unlocked && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1b1c28]">
                          <div
                            className="h-full bg-[#00d2be] transition-all"
                            style={{ width: `${badge.progress}%` }}
                          />
                        </div>
                        <span className="font-telemetry text-[9px] text-zinc-500">
                          {badge.progressText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ⏱️ RECENT TELEMETRY LOG                                            */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[#252532] bg-[#0c0d14] p-5 shadow-xl">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-f1 text-lg text-white">RECENT GRAND PRIX TELEMETRY</h3>
              <p className="font-telemetry text-xs text-zinc-400">
                Official race results, lap times, and championship points logged from the circuit.
              </p>
            </div>

            {/* Discipline Filter */}
            <div className="flex rounded-lg border border-[#20212e] bg-[#12131d] p-1 font-telemetry text-xs">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`rounded px-3 py-1 transition-colors ${
                  historyFilter === 'all' ? 'bg-[#e10600] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setHistoryFilter('multiplayer')}
                className={`rounded px-3 py-1 transition-colors ${
                  historyFilter === 'multiplayer' ? 'bg-[#e10600] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🏁 GP
              </button>
              <button
                onClick={() => setHistoryFilter('practice')}
                className={`rounded px-3 py-1 transition-colors ${
                  historyFilter === 'practice' ? 'bg-[#e10600] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🤖 PRACTICE
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center font-telemetry text-xs text-zinc-500">
              Downloading telemetry records...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-10 text-center font-telemetry text-xs text-zinc-500">
              No race telemetry found for this filter. Jump onto the track to set your first time!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredHistory.map((race) => (
                <div
                  key={race.id}
                  className="flex items-center justify-between rounded-xl border border-[#20212f] bg-[#12131d] p-3 transition-colors hover:border-[#35374d]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg font-f1 text-xs font-bold ${
                        race.rank === 1
                          ? 'bg-[#ffd700] text-black shadow-[0_0_10px_rgba(255,215,0,0.4)]'
                          : race.rank === 2
                          ? 'bg-[#e5e7eb] text-black'
                          : race.rank === 3
                          ? 'bg-[#d97706] text-black'
                          : 'bg-[#1a1b28] text-zinc-400'
                      }`}
                    >
                      {race.rank ? `P${race.rank}` : '--'}
                    </span>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-f1 text-sm text-white">{race.source}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 font-telemetry text-[9px] font-bold uppercase ${
                            race.mode === 'multiplayer'
                              ? 'bg-[#ffd700]/15 text-[#ffd700]'
                              : 'bg-[#00d2be]/15 text-[#00d2be]'
                          }`}
                        >
                          {race.mode === 'multiplayer' ? 'GP' : 'PRACTICE'}
                        </span>
                      </div>
                      <span className="font-telemetry text-[10px] text-zinc-500 uppercase">
                        UNIVERSE: {race.universe} • {race.difficulty} • {race.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div className="flex flex-col">
                      <span className="font-telemetry text-sm font-bold text-[#00d2be]">
                        {race.wpm} WPM
                      </span>
                      <span className="font-telemetry text-[10px] text-zinc-400">
                        {race.accuracy}% ACCURACY
                      </span>
                    </div>

                    {race.mode === 'multiplayer' && race.pointsAwarded > 0 && (
                      <span className="rounded bg-[#a855f7]/20 px-2 py-1 font-telemetry text-xs font-bold text-[#a855f7]">
                        +{race.pointsAwarded} PTS
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICIAL F1 CONTRACT SIGNING CONFIRMATION MODAL                           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {pendingTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#353750] bg-[#0f101a] p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)]"
            >
              {/* Header Livery Glow */}
              <div
                className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-2xl"
                style={{ backgroundColor: pendingTeam.primaryColor }}
              />

              {/* Close Button */}
              <button
                onClick={() => setPendingTeam(null)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-[#1f202e] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative z-10 flex flex-col gap-4">
                {/* Modal Title */}
                <div className="flex items-center gap-2 font-telemetry text-xs font-bold uppercase text-[#00d2be]">
                  <FileText className="h-4 w-4" />
                  <span>2026 FIA DRIVER TRANSFER CONTRACT</span>
                </div>

                <div className="flex items-center gap-4 border-b border-[#20212f] pb-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-f1 text-xl font-black text-white shadow-xl"
                    style={{ backgroundColor: pendingTeam.primaryColor }}
                  >
                    {pendingTeam.shortName}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-f1 text-2xl text-white">{pendingTeam.name}</h3>
                    <span className="font-telemetry text-xs text-zinc-400">
                      {pendingTeam.engine} • {pendingTeam.base || 'Factory Works'}
                    </span>
                  </div>
                </div>

                <p className="font-telemetry text-sm text-zinc-300">
                  Are you ready to sign with <strong className="text-white">{pendingTeam.name}</strong> for the 2026 World Championship?
                </p>

                <div className="rounded-xl border border-[#20212e] bg-[#141522] p-3 font-telemetry text-xs text-zinc-400">
                  🏎️ <strong className="text-zinc-200">Instant Livery Sync:</strong> Your multiplayer car colors, radio badge, and timing tower tags will immediately update to {pendingTeam.name}.
                </div>

                {/* Modal Actions */}
                <div className="mt-2 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setPendingTeam(null)}
                    className="rounded-xl border border-[#2a2c3d] px-4 py-2.5 font-telemetry text-xs font-bold text-zinc-400 transition-colors hover:text-white"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleConfirmContractSigning}
                    disabled={updatingTeam}
                    className="flex items-center gap-2 rounded-xl bg-[#00d2be] px-6 py-2.5 font-f1 text-xs tracking-wider text-black font-bold shadow-[0_0_20px_rgba(0,210,190,0.4)] transition-transform hover:scale-105"
                  >
                    <Check className="h-4 w-4" />
                    <span>{updatingTeam ? 'SIGNING CONTRACT...' : 'CONFIRM & SIGN CONTRACT'}</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
