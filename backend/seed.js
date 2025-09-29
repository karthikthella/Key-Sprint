// server/seedPassages.js
import mongoose from "mongoose";
import Passage from "./src/models/Passage.js";
import { connectMongo } from "./src/config/db.js";

const passages = [
  {
    text: "I've been on a diet every day since I was nineteen, which basically means I've been hungry for a decade. I've had a series of not nice boyfriends, one of whom hit me. Ah, and every time I get my heart broken, the newspapers splash it about as though it's entertainment. And it's taken two rather painful operations to get me looking like this.",
    source: "Notting Hill",
    universe: "movies"
  },
  {
    text: "Would you like something to eat? Something to nibble? Apricots, soaked in honey? Quite why, no one knows, because it stops them tasting like apricots and makes them taste like honey... and if you wanted honey, you could just... buy honey. Instead of apricots. But nevertheless they're yours if you want them.",
    source: "Notting Hill",
    universe: "movies"
  },
  {
    text: "I got bored one day - and I put everything on a bagel. Everything. All my hopes and dreams, my old report cards, every breed of dog, every last personal ad on craigslist. Sesame. Poppy seed. Salt. And it collapsed in on itself. 'Cause, you see, when you really put everything on a bagel, it becomes this....",
    source: "Everything Everywhere All At Once",
    universe: "movies"
  },
];

(async () => {
  await connectMongo();
  await Passage.deleteMany({});
  await Passage.insertMany(passages);
  console.log("✅ Seeded 25 passages (70% Taylor, 10% Olivia, 20% Movies/Shows)!");
  mongoose.disconnect();
})();
