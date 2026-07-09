// models/Employer.js
import mongoose from "mongoose";

const employerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "employer", enum: ["employer"] },
    companyName: String,
    companyWebsite: String,
    companyLinkedin: String,
    companyEmail: String,
    industry: String,
    companySize: String,
    location: String,
    state: String,
    lga: String,
    address: String,
    phone: String,
    whatsapp: String,
    logo: { type: String, default: "" },
    cacNumber: String,
    contactPersonName: String,
    contactPersonDesignation: String,
    contactPersonEmail: String,
    contactPersonPhone: String,
    onboardingComplete: { type: Boolean, default: false },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    // Email verification (matches Jobnode + Handyman schemas)
    emailVerified: { type: Boolean, default: false },

    // Employer identity verification (admin-reviewed, distinct from emailVerified)
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },
    verificationNote: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, default: null },

    // OAuth (Google/LinkedIn) — required so a Jobnode→Employer migration during
    // social signup preserves the provider link. Without these, Mongoose drops
    // the fields on create and the OAuth account becomes unlinked.
    oauthProvider: { type: String, default: null },
    oauthId: { type: String, default: null },
    needsRoleSelection: { type: Boolean, default: false },

    // Plan fields (set by subscription webhook)
    activePlan: { type: String, default: "employer_free" },
    planExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
employerSchema.index({ companyName: 1 });
employerSchema.index({ industry: 1 });
employerSchema.index({ state: 1 });
employerSchema.index({ oauthProvider: 1, oauthId: 1 }, { sparse: true });
employerSchema.index({ avgRating: -1 });
employerSchema.index({ createdAt: -1 });
employerSchema.index({ onboardingComplete: 1, createdAt: -1 });
employerSchema.index({ verificationStatus: 1, createdAt: -1 });

export default mongoose.models.Employer ||
  mongoose.model("Employer", employerSchema);
