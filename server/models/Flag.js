// models/Flag.js
import mongoose from "mongoose";

const flagSchema = new mongoose.Schema(
  {
    // ── What is being flagged ─────────────────────────────────────────────────
    targetType: {
      type: String,
      enum: ["job", "employer", "handyman", "jobseeker", "review"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // ── Who flagged it ────────────────────────────────────────────────────────
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reporterRole: {
      type: String,
      enum: ["jobseeker", "employer", "handyman", "superadmin"],
      required: true,
    },

    // ── Reason ────────────────────────────────────────────────────────────────
    reason: {
      type: String,
      enum: [
        "fraudulent_job",
        "misleading_info",
        "inappropriate_content",
        "fake_profile",
        "spam",
        "harassment",
        "false_review",
        "defamatory_review",
        "other",
      ],
      required: true,
    },
    details: {
      type: String,
      maxlength: 1000,
      default: "",
    },

    // ── Admin moderation ──────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "reviewed", "actioned", "dismissed"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

// One report per user per target (prevent spam reporting)
flagSchema.index(
  { targetId: 1, reporterId: 1 },
  { unique: true, name: "one_report_per_user_per_target" },
);

// Auto-delete resolved flags after 90 days
flagSchema.index(
  { resolvedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, sparse: true },
);

export default mongoose.models.Flag || mongoose.model("Flag", flagSchema);
