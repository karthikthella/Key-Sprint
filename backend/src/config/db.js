import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

let isConnected = false;

export async function connectMongo() {
  if (!MONGO_URI) {
    console.warn('⚠️  MONGO_URI is not set. Database persistence will be disabled.');
    return;
  }

  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    isConnected = true;
    console.log('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️  MongoDB disconnected');
    });

  } catch (err) {
    console.error('❌ MongoDB initial connection error:', err.message);
    console.warn('⚠️  Server will continue running. In-memory races will still function.');
  }
}

export async function disconnectMongo() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🛑 MongoDB disconnected gracefully');
  }
}
