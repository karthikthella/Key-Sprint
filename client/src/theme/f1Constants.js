/**
 * F1 2023 Broadcast Design System & Team Constants
 * Official colors, team liveries, and broadcast presets
 */

export const F1_TEAMS = {
  redbull: {
    id: 'redbull',
    name: 'Oracle Red Bull Racing',
    shortName: 'Red Bull',
    primaryColor: '#3671C6',
    secondaryColor: '#EA1D2D',
    accentColor: '#FFD700',
    textColor: '#FFFFFF',
    code: 'RBR'
  },
  ferrari: {
    id: 'ferrari',
    name: 'Scuderia Ferrari',
    shortName: 'Ferrari',
    primaryColor: '#E8002D',
    secondaryColor: '#000000',
    accentColor: '#FFF200',
    textColor: '#FFFFFF',
    code: 'FER'
  },
  mercedes: {
    id: 'mercedes',
    name: 'Mercedes-AMG PETRONAS',
    shortName: 'Mercedes',
    primaryColor: '#27F4D2',
    secondaryColor: '#000000',
    accentColor: '#C0C0C0',
    textColor: '#000000',
    code: 'MER'
  },
  mclaren: {
    id: 'mclaren',
    name: 'McLaren Formula 1 Team',
    shortName: 'McLaren',
    primaryColor: '#FF8000',
    secondaryColor: '#47C7FC',
    accentColor: '#111111',
    textColor: '#FFFFFF',
    code: 'MCL'
  },
  astonmartin: {
    id: 'astonmartin',
    name: 'Aston Martin Aramco',
    shortName: 'Aston Martin',
    primaryColor: '#229971',
    secondaryColor: '#CEDC00',
    accentColor: '#003529',
    textColor: '#FFFFFF',
    code: 'AST'
  },
  alpine: {
    id: 'alpine',
    name: 'BWT Alpine F1 Team',
    shortName: 'Alpine',
    primaryColor: '#0093CC',
    secondaryColor: '#FF87BC',
    accentColor: '#0B1527',
    textColor: '#FFFFFF',
    code: 'ALP'
  },
  williams: {
    id: 'williams',
    name: 'Williams Racing',
    shortName: 'Williams',
    primaryColor: '#64C4FF',
    secondaryColor: '#041E42',
    accentColor: '#FF8700',
    textColor: '#000000',
    code: 'WIL'
  },
  rb: {
    id: 'rb',
    name: 'Visa Cash App RB',
    shortName: 'RB',
    primaryColor: '#6692FF',
    secondaryColor: '#FFFFFF',
    accentColor: '#163478',
    textColor: '#FFFFFF',
    code: 'RBF'
  },
  audi: {
    id: 'audi',
    name: 'Audi F1 Team',
    shortName: 'Audi Works',
    primaryColor: '#F1001E',
    secondaryColor: '#C0C0C0',
    accentColor: '#1A1A1A',
    textColor: '#FFFFFF',
    code: 'AUD'
  },
  cadillac: {
    id: 'cadillac',
    name: 'Cadillac Formula 1 Team',
    shortName: 'Cadillac',
    primaryColor: '#D4AF37',
    secondaryColor: '#111111',
    accentColor: '#800020',
    textColor: '#000000',
    code: 'CAD'
  },
  haas: {
    id: 'haas',
    name: 'MoneyGram Haas F1 Team',
    shortName: 'Haas',
    primaryColor: '#B6BABD',
    secondaryColor: '#E6002B',
    accentColor: '#1E1E1E',
    textColor: '#000000',
    code: 'HAA'
  }
};

export const TEAM_LIST = Object.values(F1_TEAMS);

export function getTeamByIndex(index) {
  return TEAM_LIST[index % TEAM_LIST.length] || F1_TEAMS.redbull;
}

export function getDriverCode(username = '') {
  const clean = username.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (clean.length >= 3) {
    return clean.slice(0, 3);
  }
  return (clean + 'RAC').slice(0, 3);
}

export const TIRE_COMPOUNDS = {
  SOFT: { label: 'S', color: '#E8002D', bg: '#E8002D26', border: '#E8002D' },
  MEDIUM: { label: 'M', color: '#FFF200', bg: '#FFF20026', border: '#FFF200' },
  HARD: { label: 'H', color: '#FFFFFF', bg: '#FFFFFF26', border: '#FFFFFF' }
};

export const RADIO_PRESETS = [
  '📻 "Box, box, box!"',
  '📻 "Hammer time!"',
  '📻 "Simply lovely!"',
  '📻 "Leave me alone, I know what to do!"',
  '📻 "Push now, full beans!"',
  '📻 "No Mikey no, that was so not right!"',
  '🔥 "Smoooooth Operator!"'
];

/**
 * Web Audio API synthesizer for mechanical key clicks & F1 beeps
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playKeyClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 + Math.random() * 80, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  playErrorBeep() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playLightBeep(isHighPitch = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const freq = isHighPitch ? 1200 : 750;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {}
  }
}

export const soundEngine = new SoundEngine();
