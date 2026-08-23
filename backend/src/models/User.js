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
      select: false // Exclude passwordHash from queries by default for security
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
      index: -1 // Fast lookup for high score leaderboards
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
    avatar: {
      type: String,
      default: 'default'
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
 * @param {Object} params
 * @param {number} params.wpm
 * @param {number} params.accuracy
 * @param {number} params.durationMs
 * @param {boolean} [params.isWinner=false]
 */
userSchema.methods.updateStats = async function ({ wpm, accuracy = 100, durationMs = 0, isWinner = false }) {
  const currentCount = this.racesCount || 0;
  const newCount = currentCount + 1;
  const validWpm = Math.max(0, Math.min(400, Math.round(wpm || 0)));
  const validAcc = Math.max(0, Math.min(100, Math.round(accuracy || 100)));
  const validDuration = Math.max(0, Math.round(durationMs || 0));

  this.bestWPM = Math.max(this.bestWPM || 0, validWpm);
  this.avgWPM = Math.round(((this.avgWPM || 0) * currentCount + validWpm) / newCount);
  this.avgAccuracy = Math.round(((this.avgAccuracy || 100) * currentCount + validAcc) / newCount);
  this.racesCount = newCount;
  this.totalTimePlayedMs = (this.totalTimePlayedMs || 0) + validDuration;

  if (isWinner) {
    this.racesWon = (this.racesWon || 0) + 1;
  }

  return this.save();
};

export default model('User', userSchema);
