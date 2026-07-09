// models/SavedAnalyticsView.js
import mongoose from "mongoose";

const savedAnalyticsViewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    page: { type: String, enum: ["users", "jobs"], required: true },
    range: { type: String, enum: ["7d", "30d", "90d", "1y"], default: "30d" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

savedAnalyticsViewSchema.index({ page: 1, createdAt: -1 });

export default mongoose.models.SavedAnalyticsView ||
  mongoose.model("SavedAnalyticsView", savedAnalyticsViewSchema);
