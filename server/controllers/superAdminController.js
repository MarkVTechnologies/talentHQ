// controllers/superAdminController.js
// Adds forgotPassword to the existing controller.
// All existing exports (registerSuperAdmin, loginSuperAdmin, etc.) are preserved exactly.

import dotenv from "dotenv";
dotenv.config();
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import SuperAdmin from "../models/superAdmin.model.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Fail fast if secrets are missing. Signing admin tokens with a hardcoded
// fallback string would let anyone forge a valid superadmin token.
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT_SECRET and JWT_REFRESH_SECRET must be set in the environment.",
  );
}

const signAccessToken = (admin) =>
  jwt.sign({ id: admin._id, role: "superadmin" }, JWT_SECRET, {
    expiresIn: "1h",
  });
const signRefreshToken = (admin) =>
  jwt.sign({ id: admin._id, role: "superadmin" }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

// POST /api/superadmin/signup
// LOCKED DOWN. This endpoint exists only to bootstrap the FIRST super admin on
// a fresh deployment. It works only when BOTH are true:
//   1. There are zero super admins in the database yet, AND
//   2. The request includes the correct SUPERADMIN_SIGNUP_SECRET.
// Once the first admin exists, this endpoint is permanently closed — additional
// admins must be created by an already-authenticated super admin via
// POST /api/superadmin/admins (createSuperAdmin below).
export const registerSuperAdmin = async (req, res) => {
  try {
    const { fullName, email, password, signupSecret } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 1. Bootstrap-only: refuse if any super admin already exists.
    const adminCount = await SuperAdmin.countDocuments();
    if (adminCount > 0) {
      return res.status(403).json({
        message:
          "Super admin registration is closed. New admins must be added by an existing super admin.",
      });
    }

    // 2. Require the bootstrap secret (must be configured in the environment).
    const expectedSecret = process.env.SUPERADMIN_SIGNUP_SECRET;
    if (!expectedSecret) {
      return res.status(500).json({
        message:
          "Super admin signup is not configured. Set SUPERADMIN_SIGNUP_SECRET on the server.",
      });
    }
    if (!signupSecret || signupSecret !== expectedSecret) {
      return res
        .status(403)
        .json({ message: "Invalid or missing signup secret." });
    }

    const existing = await SuperAdmin.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Admin already exists." });

    const hashed = await bcrypt.hash(password, 10);
    await SuperAdmin.create({ fullName, email, password: hashed });
    return res
      .status(201)
      .json({ message: "Super Admin registered successfully." });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// POST /api/superadmin/admins
// Create an ADDITIONAL super admin. Protected: only an authenticated super
// admin (verifySuperAdmin middleware on the route) can reach this. This is the
// supported way to add admins after the first one is bootstrapped.
export const createSuperAdmin = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existing = await SuperAdmin.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Admin already exists." });

    const hashed = await bcrypt.hash(password, 10);
    await SuperAdmin.create({ fullName, email, password: hashed });
    return res
      .status(201)
      .json({ message: "Super Admin created successfully." });
  } catch (err) {
    console.error("Create admin error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// GET /api/superadmin/admins — list every super admin account
export const getAllSuperAdmins = async (req, res) => {
  try {
    const admins = await SuperAdmin.find()
      .select("fullName email createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ admins });
  } catch (err) {
    console.error("❌ getAllSuperAdmins:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// PATCH /api/superadmin/admins/:id  { fullName?, email? }
// Name/email only — password changes for another account aren't exposed here;
// an admin resets their own password via forgotPassword/resetPassword.
export const updateSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email } = req.body;
    const updates = {};

    if (fullName !== undefined) {
      if (!fullName.trim()) return res.status(400).json({ message: "Name cannot be empty" });
      updates.fullName = fullName.trim();
    }
    if (email !== undefined) {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return res.status(400).json({ message: "Email cannot be empty" });
      const existing = await SuperAdmin.findOne({ email: normalized, _id: { $ne: id } });
      if (existing) return res.status(400).json({ message: "Email already in use" });
      updates.email = normalized;
    }

    const admin = await SuperAdmin.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
      .select("fullName email createdAt")
      .lean();
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.json({ message: "Admin updated", admin });
  } catch (err) {
    console.error("❌ updateSuperAdmin:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// DELETE /api/superadmin/admins/:id
export const deleteSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.admin.id) {
      return res.status(400).json({ message: "You cannot delete your own account here." });
    }

    const total = await SuperAdmin.countDocuments();
    if (total <= 1) {
      return res.status(400).json({ message: "Cannot delete the last remaining admin account." });
    }

    const admin = await SuperAdmin.findByIdAndDelete(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.json({ message: "Admin removed" });
  } catch (err) {
    console.error("❌ deleteSuperAdmin:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// GET /api/superadmin/me — the logged-in admin's own profile
export const getOwnProfile = async (req, res) => {
  try {
    const admin = await SuperAdmin.findById(req.admin.id).select("fullName email createdAt").lean();
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.json({ admin });
  } catch (err) {
    console.error("❌ getOwnProfile:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// PATCH /api/superadmin/me  { fullName?, email? }
export const updateOwnProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const updates = {};

    if (fullName !== undefined) {
      if (!fullName.trim()) return res.status(400).json({ message: "Name cannot be empty" });
      updates.fullName = fullName.trim();
    }
    if (email !== undefined) {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return res.status(400).json({ message: "Email cannot be empty" });
      const existing = await SuperAdmin.findOne({ email: normalized, _id: { $ne: req.admin.id } });
      if (existing) return res.status(400).json({ message: "Email already in use" });
      updates.email = normalized;
    }

    const admin = await SuperAdmin.findByIdAndUpdate(req.admin.id, { $set: updates }, { new: true, runValidators: true })
      .select("fullName email createdAt")
      .lean();
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.json({ message: "Profile updated", admin });
  } catch (err) {
    console.error("❌ updateOwnProfile:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// PATCH /api/superadmin/me/password  { currentPassword, newPassword }
export const changeOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const admin = await SuperAdmin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect." });

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.refreshToken = ""; // invalidate other sessions, matching resetPassword's behavior
    await admin.save();

    return res.json({ message: "Password changed. Please log in again." });
  } catch (err) {
    console.error("❌ changeOwnPassword:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// POST /api/superadmin/login
export const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ email });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken(admin);
    const refreshToken = signRefreshToken(admin);
    admin.refreshToken = refreshToken;
    await admin.save();

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      superadmin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role || "superadmin",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// POST /api/superadmin/refresh-token
export const refreshSuperAdminToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "Refresh token required." });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const admin = await SuperAdmin.findById(decoded.id);
    if (!admin || admin.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }
    const newAccessToken = signAccessToken(admin);
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: "Token expired or invalid." });
  }
};

// POST /api/superadmin/logout
export const logoutSuperAdmin = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await SuperAdmin.findOneAndUpdate(
        { refreshToken },
        { refreshToken: null },
      );
    }
    return res.status(200).json({ message: "Logged out successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Logout failed." });
  }
};

// ── NEW: POST /api/superadmin/forgot-password ──────────────────────────────────
// Generates a reset token and sends an email via Resend (if configured).
// Always responds 200 to prevent email enumeration.
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Always respond 200 first — never reveal whether email exists
    res.status(200).json({
      message: "If this email is registered, a reset link has been sent.",
    });

    if (!email) return;

    const admin = await SuperAdmin.findOne({
      email: email.trim().toLowerCase(),
    });
    if (!admin) return; // silently stop — response already sent

    // Generate a secure random token (32 bytes hex = 64 chars)
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 30 * 60 * 1000; // 30 minutes

    admin.passwordResetToken = token;
    admin.passwordResetExpires = expiry;
    await admin.save();

    const resetUrl = `${FRONTEND_URL}/admin/reset-password?token=${token}`;

    // Send via Resend if configured
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@talenthq.ng";

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: email,
          subject: "TalentHQ Admin — Password Reset",
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <h2 style="color:#003017;font-weight:900">Password reset request</h2>
              <p style="color:#555">You requested a password reset for your TalentHQ Super Admin account.</p>
              <p style="color:#555">Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
              <a href="${resetUrl}"
                style="display:inline-block;margin:20px 0;padding:14px 28px;background:#004B23;color:#fff;font-weight:700;border-radius:12px;text-decoration:none">
                Reset Password
              </a>
              <p style="color:#999;font-size:12px">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
              <p style="color:#ccc;font-size:11px">TalentHQ · Authorised admin access only</p>
            </div>
          `,
        }),
      }).catch((e) =>
        console.error("⚠️ Resend email failed (non-fatal):", e.message),
      );
    } else {
      // Log reset link to console in development when Resend not configured
      console.log(`🔑 Admin password reset link (DEV): ${resetUrl}`);
    }
  } catch (err) {
    console.error("❌ forgotPassword:", err);
    // Response already sent — just log
  }
};

// ── NEW: POST /api/superadmin/reset-password ───────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and new password are required." });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    const admin = await SuperAdmin.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res
        .status(400)
        .json({ message: "Reset link is invalid or has expired." });
    }

    admin.password = await bcrypt.hash(password, 10);
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    admin.refreshToken = null; // invalidate all sessions
    await admin.save();

    return res
      .status(200)
      .json({ message: "Password reset successfully. Please log in." });
  } catch (err) {
    console.error("❌ resetPassword:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/superadmin/verify ────────────────────────────────────────────────
// Lightweight token validation used by the client-side superAdminAuthRedirect hook.
// Returns 200 if token is valid superadmin, 401 otherwise.
export const verifySuperAdminToken = async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "superadmin") {
      return res.status(403).json({ message: "Not superadmin" });
    }
    // Optionally verify admin still exists in DB
    const admin = await SuperAdmin.findById(decoded.id).lean();
    if (!admin) return res.status(401).json({ message: "Admin not found" });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
