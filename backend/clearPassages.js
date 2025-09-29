// clearPassages.js
import mongoose from "mongoose";
import Passage from "./src/models/Passage.js";
import { connectMongo } from "./src/config/db.js";

(async () => {
  try {
    await connectMongo();
    await Passage.deleteMany({});
    console.log("🗑️ Cleared all passages from DB!");
  } catch (err) {
    console.error("❌ Error clearing passages:", err);
  } finally {
    mongoose.disconnect();
  }
})();
