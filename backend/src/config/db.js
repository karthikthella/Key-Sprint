import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

export async function connectMongo() {
  if (!MONGO_URI) {
    console.log('ℹ️  MONGO_URI not set — skipping Mongo connection for now.');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
}
