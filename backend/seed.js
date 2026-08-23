import mongoose from 'mongoose';
import Passage from './src/models/Passage.js';
import { connectMongo, disconnectMongo } from './src/config/db.js';
import { CURATED_PASSAGES } from './src/services/passageService.js';

(async () => {
  console.log('🌱 Seeding Key-Sprint passages...');
  await connectMongo();

  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️  MongoDB is not available. Passages are stored in-memory in src/services/passageService.js.');
    console.log(`ℹ️  ${CURATED_PASSAGES.length} curated fallback passages are available offline.`);
    process.exit(0);
  }

  try {
    await Passage.deleteMany({});
    const created = await Passage.insertMany(CURATED_PASSAGES.map(({ id, ...rest }) => rest));
    console.log(`✅ Successfully seeded ${created.length} passages into MongoDB!`);
    console.log('Universes seeded:', [...new Set(CURATED_PASSAGES.map((p) => p.universe))].join(', '));
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    await disconnectMongo();
    process.exit(0);
  }
})();
