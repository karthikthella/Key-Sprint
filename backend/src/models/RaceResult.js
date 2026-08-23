import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const raceResultSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    passage: {
      type: Schema.Types.ObjectId,
      ref: 'Passage',
      required: false
    },
    wpm: {
      type: Number,
      required: true,
      min: 0,
      max: 400
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    charsTyped: {
      type: Number,
      default: 0,
      min: 0
    },
    durationMs: {
      type: Number,
      required: true,
      min: 0
    },
    rank: {
      type: Number,
      default: 1,
      min: 1
    },
    isWinner: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast user race history lookup sorted by newest first
raceResultSchema.index({ user: 1, createdAt: -1 });

export default model('RaceResult', raceResultSchema);
