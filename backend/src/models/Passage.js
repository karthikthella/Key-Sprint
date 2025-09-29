// server/src/models/Passage.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

/**
 * Passage schema
 * - text: the passage content (required)
 * - source: string: where it came from (book, user-submission, etc.)
 * - universe: category/tag (e.g., numbers, bible, anime)
 * - length: stored length (characters) computed automatically
 * - createdAt: timestamp
 */
const passageSchema = new Schema({
  text: { type: String, required: true },
  source: { type: String, default: 'user-submission' },
  universe: { type: String, default: 'general' },
  length: { type: Number, required: true },
  createdAt: { type: Date, default: () => new Date() }
});

// Pre-validate hook: compute length from text so callers don't need to set it
passageSchema.pre('validate', function (next) {
  if (this.text) this.length = this.text.length;
  next();
});

export default model('Passage', passageSchema);
