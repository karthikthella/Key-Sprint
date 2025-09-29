// server/src/models/RaceResult.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

/**
 * RaceResult records a saved race.
 * - user: optional ObjectId reference to User
 * - passage: optional reference to the Passage used
 * - wpm: words per minute (number)
 * - accuracy: percentage 0-100
 * - charsTyped: characters typed during the run
 * - durationMs: duration of the race in milliseconds (used to recalc if needed)
 * - createdAt: timestamp
 */
const raceResultSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  passage: { type: Schema.Types.ObjectId, ref: 'Passage', required: false },
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  charsTyped: { type: Number, default: 0 },
  durationMs: { type: Number, required: true },
  createdAt: { type: Date, default: () => new Date() }
});

export default model('RaceResult', raceResultSchema);
