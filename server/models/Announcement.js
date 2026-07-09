// models/Announcement.js
import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, maxlength: 2000 },

    // Who should see it
    audience: {
      type: String,
      enum: ["all", "employer", "handyman", "jobseeker"],
      default: "all",
    },

    // Visual treatment on the consuming UI (banner color/icon)
    priority: {
      type: String,
      enum: ["info", "success", "warning", "critical"],
      default: "info",
    },

    isActive: { type: Boolean, default: true },

    // Optional scheduling window — null means "no bound" on that side
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

announcementSchema.index({ isActive: 1, createdAt: -1 });
announcementSchema.index({ audience: 1 });

export default mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);
