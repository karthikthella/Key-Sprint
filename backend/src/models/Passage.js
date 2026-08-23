import mongoose from 'mongoose';
import { getFallbackPassage } from '../services/passageService.js';

const { Schema, model } = mongoose;

const passageSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    source: {
      type: String,
      default: 'General Knowledge',
      trim: true
    },
    universe: {
      type: String,
      default: 'general',
      trim: true,
      lowercase: true,
      index: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true
    },
    length: {
      type: Number,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

passageSchema.pre('validate', function (next) {
  if (this.text) {
    this.length = this.text.length;
  }
  next();
});

/**
 * Fast O(1) random passage selector with fallback to curated library
 * @param {Object} [filter]
 * @param {string} [filter.universe]
 * @param {string} [filter.difficulty]
 */
passageSchema.statics.getRandom = async function (filter = {}) {
  // If DB not connected, immediately return fallback
  if (mongoose.connection.readyState !== 1) {
    return getFallbackPassage(typeof filter === 'string' ? { universe: filter } : filter);
  }

  try {
    const match = {};

    if (typeof filter === 'string') {
      if (filter && filter.toLowerCase() !== 'all') {
        match.universe = filter.toLowerCase();
      }
    } else if (typeof filter === 'object' && filter !== null) {
      if (filter.universe && filter.universe.toLowerCase() !== 'all') {
        match.universe = filter.universe.toLowerCase();
      }
      if (filter.difficulty && ['easy', 'medium', 'hard'].includes(filter.difficulty.toLowerCase())) {
        match.difficulty = filter.difficulty.toLowerCase();
      }
    }

    const samplePipeline = [{ $sample: { size: 1 } }];
    if (Object.keys(match).length > 0) {
      samplePipeline.unshift({ $match: match });
    }

    const results = await this.aggregate(samplePipeline);
    if (results && results.length > 0) {
      return results[0];
    }
    return getFallbackPassage(typeof filter === 'string' ? { universe: filter } : filter);
  } catch (err) {
    console.warn('Passage.getRandom DB aggregation fallback:', err.message);
    return getFallbackPassage(typeof filter === 'string' ? { universe: filter } : filter);
  }
};

export default model('Passage', passageSchema);
