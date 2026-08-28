import mongoose from 'mongoose';
import { MONGO_URI } from '../src/config/env.js';
import User from '../src/models/User.js';
import RaceResult from '../src/models/RaceResult.js';

async function purgeDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const userCount = await User.countDocuments();
    const raceCount = await RaceResult.countDocuments();

    console.log(`Found ${userCount} existing users and ${raceCount} race results.`);

    const userDeleteResult = await User.deleteMany({});
    const raceDeleteResult = await RaceResult.deleteMany({});

    console.log(`✅ Deleted ${userDeleteResult.deletedCount} users.`);
    console.log(`✅ Deleted ${raceDeleteResult.deletedCount} race results.`);

    await mongoose.disconnect();
    console.log('Database purged successfully. Fresh slate ready!');
    process.exit(0);
  } catch (err) {
    console.error('Error purging database:', err);
    process.exit(1);
  }
}

purgeDatabase();
