import RaceResult from '../models/RaceResult.js';

// --- OFFICIAL 2026 CONSTRUCTOR GRID (11 TEAMS) ---
export const F1_CONSTRUCTORS_2026 = [
  {
    id: 'mclaren',
    name: 'McLaren Formula 1 Team',
    shortName: 'MCL',
    primaryColor: '#FF8000',
    secondaryColor: '#1E1E1E',
    engine: 'Mercedes-AMG',
    base: 'Woking, United Kingdom'
  },
  {
    id: 'ferrari',
    name: 'Scuderia Ferrari HP',
    shortName: 'FER',
    primaryColor: '#E8002D',
    secondaryColor: '#002B49',
    engine: 'Ferrari Works',
    base: 'Maranello, Italy'
  },
  {
    id: 'redbull',
    name: 'Oracle Red Bull Racing',
    shortName: 'RBR',
    primaryColor: '#3671C6',
    secondaryColor: '#CC1E4A',
    engine: 'Red Bull-Ford Powertrains',
    base: 'Milton Keynes, United Kingdom'
  },
  {
    id: 'mercedes',
    name: 'Mercedes-AMG PETRONAS',
    shortName: 'MER',
    primaryColor: '#27F4D2',
    secondaryColor: '#E5E7EB',
    engine: 'Mercedes Works',
    base: 'Brackley, United Kingdom'
  },
  {
    id: 'astonmartin',
    name: 'Aston Martin Aramco F1 Team',
    shortName: 'AST',
    primaryColor: '#229971',
    secondaryColor: '#CEDC00',
    engine: 'Honda Works',
    base: 'Silverstone, United Kingdom'
  },
  {
    id: 'audi',
    name: 'Audi F1 Team',
    shortName: 'AUD',
    primaryColor: '#F1001E',
    secondaryColor: '#C0C0C0',
    engine: 'Audi Works Power Unit',
    base: 'Hinwil, Switzerland / Neuburg, Germany'
  },
  {
    id: 'cadillac',
    name: 'Cadillac Formula 1 Team',
    shortName: 'CAD',
    primaryColor: '#D4AF37',
    secondaryColor: '#1A1A1A',
    engine: 'Ferrari Customer Unit',
    base: 'Fishers, Indiana, USA'
  },
  {
    id: 'alpine',
    name: 'BWT Alpine F1 Team',
    shortName: 'ALP',
    primaryColor: '#0093CC',
    secondaryColor: '#FF87BC',
    engine: 'Mercedes-AMG',
    base: 'Enstone, United Kingdom'
  },
  {
    id: 'rb',
    name: 'Visa Cash App RB (Racing Bulls)',
    shortName: 'VRB',
    primaryColor: '#6692FF',
    secondaryColor: '#FFFFFF',
    engine: 'Red Bull-Ford',
    base: 'Faenza, Italy'
  },
  {
    id: 'williams',
    name: 'Williams Racing',
    shortName: 'WIL',
    primaryColor: '#64C4FF',
    secondaryColor: '#00143E',
    engine: 'Mercedes-AMG',
    base: 'Grove, United Kingdom'
  },
  {
    id: 'haas',
    name: 'MoneyGram Haas F1 Team',
    shortName: 'HAS',
    primaryColor: '#B6BABD',
    secondaryColor: '#E10600',
    engine: 'Ferrari / Toyota Technical',
    base: 'Kannapolis, North Carolina, USA'
  }
];

// --- FIA SUPERLICENCE TIERS (Backend Single Source of Truth) ---
export const SUPERLICENCE_TIERS = {
  CLASS_S: {
    grade: 'CLASS S',
    title: 'FIA WORLD CHAMPION (LEGEND)',
    minWpm: 120,
    color: '#ffd700',
    description: 'Alien-tier typing pace. Hall of Fame legend.'
  },
  CLASS_A: {
    grade: 'CLASS A',
    title: 'FORMULA 1 GRAND PRIX DRIVER',
    minWpm: 100,
    color: '#e10600',
    description: 'Official Formula 1 Grand Prix Winner pace.'
  },
  CLASS_B: {
    grade: 'CLASS B',
    title: 'FORMULA 2 CHALLENGER',
    minWpm: 80,
    color: '#f59e0b',
    description: 'High-speed contender ready for F1 promotion.'
  },
  CLASS_C: {
    grade: 'CLASS C',
    title: 'FORMULA 3 CONTENDER',
    minWpm: 60,
    color: '#a855f7',
    description: 'Strong racing pace and consistent throttle control.'
  },
  CLASS_D: {
    grade: 'CLASS D',
    title: 'FORMULA 4 JUNIOR',
    minWpm: 40,
    color: '#00d2be',
    description: 'Emerging young driver mastering high-speed finger dexterity.'
  },
  CLASS_E: {
    grade: 'CLASS E',
    title: 'KARTING CADET',
    minWpm: 0,
    color: '#22c55e',
    description: 'Motorsport rookie. Building core typing muscle memory.'
  }
};

/**
 * Computes dynamic Superlicence Tier and license metadata for a driver
 */
export function computeDriverTier(bestWpm = 0) {
  if (bestWpm >= 120) return SUPERLICENCE_TIERS.CLASS_S;
  if (bestWpm >= 100) return SUPERLICENCE_TIERS.CLASS_A;
  if (bestWpm >= 80) return SUPERLICENCE_TIERS.CLASS_B;
  if (bestWpm >= 60) return SUPERLICENCE_TIERS.CLASS_C;
  if (bestWpm >= 40) return SUPERLICENCE_TIERS.CLASS_D;
  return SUPERLICENCE_TIERS.CLASS_E;
}

/**
 * Evaluates the 9 official F1 Badges against a user's actual database records
 */
export function evaluateUserBadges(user, recentRaces = []) {
  const gpWon = user.gpStats?.racesWon || user.racesWon || 0;
  const gpCount = user.gpStats?.racesCount || user.racesCount || 0;
  const bestWpm = user.bestWPM || 0;

  // Check consecutive wins
  let maxConsecutiveWins = 0;
  let currentStreak = 0;
  [...recentRaces].reverse().forEach((r) => {
    if (r.mode === 'multiplayer' && r.isWinner) {
      currentStreak++;
      if (currentStreak > maxConsecutiveWins) maxConsecutiveWins = currentStreak;
    } else if (r.mode === 'multiplayer') {
      currentStreak = 0;
    }
  });

  // Check 100% clean lap
  const hasCleanLap = recentRaces.some((r) => r.accuracy === 100);

  // Check precision engineer (98%+ across 10 races)
  const last10 = recentRaces.slice(0, 10);
  const isPrecisionEngineer = last10.length >= 10 && last10.every((r) => r.accuracy >= 98);

  // Check Grand Chelem (P1 + accuracy >= 98% in single race)
  const hasGrandChelem = recentRaces.some((r) => r.mode === 'multiplayer' && r.isWinner && r.accuracy >= 98);

  return [
    {
      id: 'grand_prix_winner',
      name: 'Grand Prix Winner',
      category: 'Victory',
      description: 'Win your first multiplayer Grand Prix race (P1)',
      assetName: 'grand_prix_winner.jpg',
      unlocked: gpWon >= 1,
      progress: Math.min(100, Math.round((gpWon / 1) * 100)),
      progressText: `${gpWon} / 1 Wins`
    },
    {
      id: 'speed_trap_king',
      name: 'Speed Trap King',
      category: 'Speed',
      description: 'Break the 100 WPM speed trap in an official race',
      assetName: 'speed_trap_king.jpg',
      unlocked: bestWpm >= 100,
      progress: Math.min(100, Math.round((bestWpm / 100) * 100)),
      progressText: `${bestWpm} / 100 WPM`
    },
    {
      id: 'untouchable',
      name: 'Untouchable',
      category: 'Legend',
      description: 'Achieve legendary status with 120+ peak Net WPM',
      assetName: 'untouchable.jpg',
      unlocked: bestWpm >= 120,
      progress: Math.min(100, Math.round((bestWpm / 120) * 100)),
      progressText: `${bestWpm} / 120 WPM`
    },
    {
      id: 'purple_reign',
      name: 'Purple Reign',
      category: 'Pace',
      description: 'Set the fastest lap in 10 official multiplayer races',
      assetName: 'purple_reign.jpg',
      unlocked: gpWon >= 10,
      progress: Math.min(100, Math.round((gpWon / 10) * 100)),
      progressText: `${gpWon} / 10 Fastest Laps`
    },
    {
      id: 'hat_trick_hero',
      name: 'Hat-Trick Hero',
      category: 'Dominance',
      description: 'Win 3 consecutive multiplayer Grand Prix races in a row',
      assetName: 'hat_trick_hero.jpg',
      unlocked: maxConsecutiveWins >= 3,
      progress: Math.min(100, Math.round((maxConsecutiveWins / 3) * 100)),
      progressText: `${maxConsecutiveWins} / 3 Streak`
    },
    {
      id: 'grand_chelem',
      name: 'Grand Chelem',
      category: 'Perfection',
      description: 'Achieve total dominance: P1 Victory + 98%+ Accuracy in 1 race',
      assetName: 'grand_chelem.jpg',
      unlocked: hasGrandChelem,
      progress: hasGrandChelem ? 100 : 0,
      progressText: hasGrandChelem ? 'Completed' : 'Locked'
    },
    {
      id: 'flawless_stint',
      name: 'Flawless Stint',
      category: 'Accuracy',
      description: 'Complete an official race with 100% Accuracy (0 typos)',
      assetName: 'flawless_stint.jpg',
      unlocked: hasCleanLap,
      progress: hasCleanLap ? 100 : 0,
      progressText: hasCleanLap ? '100% Clean' : 'Locked'
    },
    {
      id: 'precision_engineer',
      name: 'Precision Engineer',
      category: 'Consistency',
      description: 'Maintain 98%+ accuracy across 10 completed races',
      assetName: 'precision_engineer.jpg',
      unlocked: isPrecisionEngineer,
      progress: Math.min(100, Math.round((last10.filter((r) => r.accuracy >= 98).length / 10) * 100)),
      progressText: `${last10.filter((r) => r.accuracy >= 98).length} / 10 Clean Races`
    },
    {
      id: 'paddock_veteran',
      name: 'Paddock Veteran',
      category: 'Endurance',
      description: 'Compete in 50 official Grand Prix races',
      assetName: 'paddock_veteran.jpg',
      unlocked: gpCount >= 50,
      progress: Math.min(100, Math.round((gpCount / 50) * 100)),
      progressText: `${gpCount} / 50 Races`
    }
  ];
}

/**
 * Builds the complete Telemetry Analytics Matrix for a user
 */
export async function buildTelemetryAnalytics(userId, user) {
  // Fetch past 20 races for progression chart
  const recentRaces = await RaceResult.find({ user: userId })
    .populate('passage', 'source universe difficulty')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Speed Progression Trend Array (Chronological for Graph)
  const speedTrend = [...recentRaces]
    .reverse()
    .map((r, idx) => ({
      index: idx + 1,
      raceId: r._id,
      wpm: r.wpm,
      accuracy: r.accuracy,
      mode: r.mode || 'multiplayer',
      rank: r.rank || 1,
      date: new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      source: r.passage?.source || 'Circuit Lap'
    }));

  // Universe Speed Matrix
  const universeSpeeds = {};
  recentRaces.forEach((r) => {
    const uni = r.passage?.universe || 'general';
    if (!universeSpeeds[uni]) {
      universeSpeeds[uni] = { totalWpm: 0, count: 0, bestWpm: 0 };
    }
    universeSpeeds[uni].totalWpm += r.wpm;
    universeSpeeds[uni].count += 1;
    universeSpeeds[uni].bestWpm = Math.max(universeSpeeds[uni].bestWpm, r.wpm);
  });

  const universeMatrix = Object.entries(universeSpeeds).map(([universe, data]) => ({
    universe,
    avgWpm: Math.round(data.totalWpm / data.count),
    bestWpm: data.bestWpm,
    racesCount: data.count
  }));

  const tier = computeDriverTier(user.bestWPM || 0);
  const badges = evaluateUserBadges(user, recentRaces);

  const selectedTeamKey = user.avatar || 'redbull';
  const selectedTeam =
    F1_CONSTRUCTORS_2026.find((t) => t.id === selectedTeamKey) || F1_CONSTRUCTORS_2026[0];

  const gpRaces = user.gpStats?.racesCount || 0;
  const gpWon = user.gpStats?.racesWon || 0;
  const gpWinRate = gpRaces > 0 ? Math.round((gpWon / gpRaces) * 100) : 0;

  return {
    user: {
      id: user._id || user.id,
      username: user.username,
      email: user.email,
      driverNumber: user.driverNumber || 1,
      bestWPM: user.bestWPM || 0,
      avgWPM: user.avgWPM || 0,
      avgAccuracy: user.avgAccuracy || 100,
      totalKeystrokes: user.totalKeystrokes || 0,
      totalTimePlayedSec: Math.round((user.totalTimePlayedMs || 0) / 1000),
      createdAt: user.createdAt
    },
    superlicence: {
      grade: tier.grade,
      title: tier.title,
      color: tier.color,
      description: tier.description,
      licenseNumber: `FIA-${user._id?.toString().slice(-6).toUpperCase() || '2026'}`
    },
    contract: {
      team: selectedTeam,
      allConstructors: F1_CONSTRUCTORS_2026
    },
    disciplineStats: {
      multiplayer: {
        racesCount: gpRaces,
        racesWon: gpWon,
        podiums: user.gpStats?.podiums || 0,
        championshipPoints: user.gpStats?.championshipPoints || 0,
        winRatePercent: gpWinRate
      },
      practice: {
        sessionsCount: user.practiceStats?.sessionsCount || 0,
        bestWPM: user.practiceStats?.bestWPM || 0,
        totalWordsTyped: user.practiceStats?.totalWordsTyped || 0
      }
    },
    badges,
    speedTrend,
    universeMatrix,
    recentRaces: recentRaces.map((r) => ({
      id: r._id,
      wpm: r.wpm,
      accuracy: r.accuracy,
      rank: r.rank,
      isWinner: r.isWinner,
      mode: r.mode || 'multiplayer',
      pointsAwarded: r.pointsAwarded || 0,
      source: r.passage?.source || 'Grand Prix Circuit',
      universe: r.passage?.universe || 'Quotes',
      difficulty: r.passage?.difficulty || 'Medium',
      date: new Date(r.createdAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }))
  };
}
