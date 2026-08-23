import Passage from './src/models/Passage.js';
import { connectMongo, disconnectMongo } from './src/config/db.js';

(async () => {
  try {
    await connectMongo();
    const result = await Passage.deleteMany({});
    console.log(`🗑️  Cleared ${result.deletedCount} passages from the database.`);
  } catch (err) {
    console.error('❌ Error clearing passages:', err.message);
  } finally {
    await disconnectMongo();
    process.exit(0);
  }
})();
