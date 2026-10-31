// models/NudgeState.js
// One document per user that has been considered for a re-engagement nudge
// (verify email / create application / matching jobs). Kept separate from the
// user models so nudging never touches account documents.
import mongoose from "mongoose";

const nudgeStateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userModel: {
      type: String,
      required: true,
      enum: ["Jobnode", "Handyman", "Employer"],
    },
    lastSentAt: { type: Date, default: null },
    lastKind: { type: String, default: null }, // verify | application | jobMatch
    counts: {
      verify: { type: Number, default: 0 },
      application: { type: Number, default: 0 },
      jobMatch: { type: Number, default: 0 },
    },
    // Jobs created after this date count as "new" for the next job-match email
    lastJobMatchAt: { type: Date, default: null },
    optedOut: { type: Boolean, default: false },
    optedOutAt: { type: Date, default: null },
  },
  { timestamps: true },
);

nudgeStateSchema.index({ userId: 1, userModel: 1 }, { unique: true });

export default mongoose.models.NudgeState ||
  mongoose.model("NudgeState", nudgeStateSchema);
