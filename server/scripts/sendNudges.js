// scripts/sendNudges.js
// Sends re-engagement nudges. Run once a day from a DirectAdmin cron job:
//   node scripts/sendNudges.js            → send
//   node scripts/sendNudges.js --dry-run  → list who would get what, send nothing
import "dotenv/config";
import mongoose from "mongoose";
import { runNudges } from "../utils/nudges.js";

const dryRun = process.argv.includes("--dry-run");

try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`\n=== Nudges ${new Date().toISOString()}${dryRun ? " (dry run)" : ""} ===`);
  const summary = await runNudges({ dryRun });
  console.log("Summary:", JSON.stringify(summary));
} catch (err) {
  console.error("❌ Nudge run failed:", err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
