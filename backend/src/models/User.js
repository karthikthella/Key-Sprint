import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
      index: true
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      sparse: true
    },
    passwordHash: {
      type: String,
      required: false,
      select: false
    },
    avgWPM: {
      type: Number,
      default: 0,
      min: 0,
      max: 400
    },
    bestWPM: {
      type: Number,
      default: 0,
      min: 0,
      max: 400,
      index: -1
    },
    racesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    racesWon: {
      type: Number,
      default: 0,
      min: 0,
      index: -1
    },
    avgAccuracy: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    totalTimePlayedMs: {
      type: Number,
      default: 0,
      min: 0
    },
    totalKeystrokes: {
      type: Number,
      default: 0,
      min: 0
    },
    avatar: {
      type: String,
      default: 'redbull'
    },
    driverNumber: {
      type: Number,
      default: () => Math.floor(2 + Math.random() * 97)
    },
    // Official Multiplayer Grand Prix Statistics
    gpStats: {
      racesCount: { type: Number, default: 0 },
      racesWon: { type: Number, default: 0 },
      podiums: { type: Number, default: 0 },
      championshipPoints: { type: Number, default: 0 }
    },
    // Practice & Simulator Session Statistics
    practiceStats: {
      sessionsCount: { type: Number, default: 0 },
      bestWPM: { type: Number, default: 0 },
      totalWordsTyped: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Atomically updates user's aggregate statistics after completing a race.
 */
userSchema.methods.updateStats = async function ({
  wpm,
  accuracy = 100,
  durationMs = 0,
  charsTyped = 0,
  isWinner = false,
  rank = 1,
  mode = 'multiplayer',
  pointsAwarded = 0
}) {
  const validWpm = Math.max(0, Math.min(400, Math.round(wpm || 0)));
  const validAcc = Math.max(0, Math.min(100, Math.round(accuracy || 100)));
  const validDuration = Math.max(0, Math.round(durationMs || 0));
  const validChars = Math.max(0, Math.round(charsTyped || 0));

  const currentTotalRaces = this.racesCount || 0;
  const newTotalRaces = currentTotalRaces + 1;

  // Global All-Time Metrics
  this.bestWPM = Math.max(this.bestWPM || 0, validWpm);
  this.avgWPM = Math.round(((this.avgWPM || 0) * currentTotalRaces + validWpm) / newTotalRaces);
  this.avgAccuracy = Math.round(((this.avgAccuracy || 100) * currentTotalRaces + validAcc) / newTotalRaces);
  this.racesCount = newTotalRaces;
  this.totalTimePlayedMs = (this.totalTimePlayedMs || 0) + validDuration;
  this.totalKeystrokes = (this.totalKeystrokes || 0) + validChars;

  if (!this.gpStats) this.gpStats = { racesCount: 0, racesWon: 0, podiums: 0, championshipPoints: 0 };
  if (!this.practiceStats) this.practiceStats = { sessionsCount: 0, bestWPM: 0, totalWordsTyped: 0 };

  if (mode === 'multiplayer') {
    this.gpStats.racesCount = (this.gpStats.racesCount || 0) + 1;
    if (isWinner) {
      this.gpStats.racesWon = (this.gpStats.racesWon || 0) + 1;
      this.racesWon = (this.racesWon || 0) + 1;
    }
    if (rank <= 3) {
      this.gpStats.podiums = (this.gpStats.podiums || 0) + 1;
    }
    this.gpStats.championshipPoints = (this.gpStats.championshipPoints || 0) + pointsAwarded;
  } else {
    this.practiceStats.sessionsCount = (this.practiceStats.sessionsCount || 0) + 1;
    this.practiceStats.bestWPM = Math.max(this.practiceStats.bestWPM || 0, validWpm);
    this.practiceStats.totalWordsTyped = (this.practiceStats.totalWordsTyped || 0) + Math.round(validChars / 5);
  }

  return this.save();
};

export default model('User', userSchema);
