// server/src/models/User.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: false, lowercase: true, trim: true },
  passwordHash: { type: String, required: false }, // required only for auth-registered users
  avgWPM: { type: Number, default: 0 },
  bestWPM: { type: Number, default: 0 },
  racesCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() }
});

// note: existing users (created before auth) may lack passwordHash. You can
// support them by asking to set password on first login/upgrade or recreate them.

export default model('User', userSchema);
