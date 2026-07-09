// controllers/authController.js
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Jobnode from "../models/Jobnode.js";
import Handyman from "../models/Handyman.js";
import Employer from "../models/Employer.js";
import EmailToken from "../models/EmailToken.js";
import Session from "../models/Session.js";
import Notification from "../models/Notification.js";
import JobseekerApplication from "../models/JobseekerApplication.js";
import JobModel from "../models/job.model.js";
import { parseDevice } from "../utils/deviceParser.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../utils/email.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a user role → the userModel string the EmailToken schema expects */
const roleToUserModel = (role) => {
  switch (role) {
    case "handyman":
      return "Handyman";
    case "employer":
      return "Employer";
    case "jobseeker":
    default:
      return "Jobnode";
  }
};

/** Given a user doc (from any collection), return its userModel string */
const docToUserModel = (doc) => roleToUserModel(doc?.role);

/** Check email across all 3 collections in parallel — fast */
const emailExistsAnywhere = async (email) => {
  const [j, h, e] = await Promise.all([
    Jobnode.findOne({ email }).lean(),
    Handyman.findOne({ email }).lean(),
    Employer.findOne({ email }).lean(),
  ]);
  return Boolean(j || h || e);
};

/** Strip sensitive fields from any user object */
const sanitize = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.password;
  delete obj.__v;
  delete obj.refreshToken;
  return obj;
};

/** Find user across all 3 collections in parallel */
const findUserByEmail = async (email) => {
  const [j, h, e] = await Promise.all([
    Jobnode.findOne({ email }),
    Handyman.findOne({ email }),
    Employer.findOne({ email }),
  ]);
  return j || h || e || null;
};

const findUserById = async (id, role) => {
  switch (role) {
    case "jobseeker":
      return Jobnode.findById(id).select("-password -__v -refreshToken").lean();
    case "handyman":
      return Handyman.findById(id)
        .select("-password -__v -refreshToken")
        .lean();
    case "employer":
      return Employer.findById(id)
        .select("-password -__v -refreshToken")
        .lean();
    default:
      return null;
  }
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/** Issue JWT, set the httpOnly cookie, and record a Session for the sessions UI */
const issueToken = async (req, res, user) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  try {
    const userAgent = req.headers["user-agent"] || "";
    const { device, browser } = parseDevice(userAgent);
    await Session.create({
      userId: user._id,
      userModel: docToUserModel(user),
      tokenHash: hashToken(token),
      userAgent,
      ip: req.ip || "",
      device,
      browser,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch (err) {
    // Session tracking is a UX nicety — never block login/signup over it.
    console.error("⚠️  Session record failed (non-fatal):", err.message);
  }

  return token;
};

// ── POST /api/auth/signup2 ────────────────────────────────────────────────────
export const signup2 = async (req, res) => {
  try {
    const {
      role,
      fullName,
      email,
      password,
      skills,
      location,
      companyName,
      companyWebsite,
    } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!role || !["jobseeker", "handyman", "employer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res
        .status(400)
        .json({ message: "Full name, email and password are required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Cross-collection email uniqueness ───────────────────────────────────
    if (await emailExistsAnywhere(normalizedEmail)) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);

    let created;
    if (role === "jobseeker") {
      created = await Jobnode.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashed,
        role: "jobseeker",
      });
    } else if (role === "handyman") {
      let skillsArr = [];
      if (Array.isArray(skills)) skillsArr = skills.filter(Boolean);
      else if (typeof skills === "string" && skills.trim()) {
        skillsArr = skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      created = await Handyman.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashed,
        role: "handyman",
        skills: skillsArr,
        location: location?.trim() || "",
      });
    } else {
      created = await Employer.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashed,
        role: "employer",
        companyName: companyName?.trim() || "",
        companyWebsite: companyWebsite?.trim() || "",
      });
    }

    // ── Issue JWT cookie ────────────────────────────────────────────────────
    await issueToken(req, res, created);

    // ── Send verification email (fire-and-forget — never blocks the response)
    try {
      const verifyToken = crypto.randomBytes(32).toString("hex");
      await EmailToken.create({
        userId: created._id,
        userModel: roleToUserModel(role), // required by EmailToken schema
        token: verifyToken,
        type: "email_verification", // must match schema enum
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      // fire-and-forget — don't await so signup response stays fast
      sendVerificationEmail(normalizedEmail, verifyToken).catch((err) =>
        console.error(
          "⚠️  Verification email failed (non-fatal):",
          err.message,
        ),
      );
    } catch (emailErr) {
      // Email token creation failed — log but don't block signup
      console.error("⚠️  Could not create email token:", emailErr.message);
    }

    // ── Send welcome email (fire-and-forget) ────────────────────────────────
    sendWelcomeEmail(normalizedEmail, fullName.trim(), role).catch((err) =>
      console.error("⚠️  Welcome email failed (non-fatal):", err.message),
    );

    return res.status(201).json({
      message: "Account created successfully",
      user: sanitize(created),
    });
  } catch (err) {
    console.error("❌ signup2:", err);
    res.status(500).json({ message: "Signup failed. Please try again." });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    // Constant-time compare — prevents timing attacks / email enumeration
    const dummyHash =
      "$2b$12$invalidhashusedfortimingprotectiononly1234567890abcdef";
    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await issueToken(req, res, user);

    return res.status(200).json({
      message: "Login successful",
      user: sanitize(user),
    });
  } catch (err) {
    console.error("❌ login:", err);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const user = await findUserById(id, role);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error("❌ getMe:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const currentToken = req.cookies?.token;
    if (currentToken) {
      await Session.deleteOne({ tokenHash: hashToken(currentToken) });
    }
  } catch (err) {
    console.error("⚠️  Session cleanup on logout failed (non-fatal):", err.message);
  }

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.status(200).json({ message: "Logged out successfully" });
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
// Always returns 200 — prevents email enumeration.
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    // Always respond 200 regardless of whether user exists
    if (!user) {
      return res.status(200).json({
        message:
          "If this email is registered, you'll receive a reset link shortly.",
      });
    }

    // Delete any existing reset tokens for this user (one active at a time)
    await EmailToken.deleteMany({ userId: user._id, type: "password_reset" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    await EmailToken.create({
      userId: user._id,
      userModel: docToUserModel(user), // required by EmailToken schema
      token: resetToken,
      type: "password_reset", // must match schema enum
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Fire-and-forget
    sendPasswordResetEmail(normalizedEmail, resetToken).catch((err) =>
      console.error("⚠️  Reset email failed:", err.message),
    );

    return res.status(200).json({
      message:
        "If this email is registered, you'll receive a reset link shortly.",
    });
  } catch (err) {
    console.error("❌ forgotPassword:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    // Look up the token document
    const tokenDoc = await EmailToken.findOne({
      token,
      type: "password_reset",
    });

    if (!tokenDoc) {
      return res.status(400).json({
        message: "Invalid or expired reset link. Please request a new one.",
      });
    }

    if (tokenDoc.expiresAt < new Date()) {
      await tokenDoc.deleteOne();
      return res.status(400).json({
        message: "This reset link has expired. Please request a new one.",
      });
    }

    const { userId } = tokenDoc;

    // Find the user across all collections
    const [j, h, e] = await Promise.all([
      Jobnode.findById(userId),
      Handyman.findById(userId),
      Employer.findById(userId),
    ]);
    const user = j || h || e;

    if (!user) {
      await tokenDoc.deleteOne();
      return res.status(400).json({ message: "User account not found." });
    }

    // Hash and save the new password
    user.password = await bcrypt.hash(password, 12);
    await user.save();

    // Delete the used token (one-time use) and sign the account out everywhere
    await Promise.all([tokenDoc.deleteOne(), Session.deleteMany({ userId: user._id })]);

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("❌ resetPassword:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/auth/verify-email ────────────────────────────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res
        .status(400)
        .json({ message: "Verification token is required." });
    }

    const tokenDoc = await EmailToken.findOne({
      token,
      type: "email_verification",
    });

    if (!tokenDoc) {
      return res
        .status(400)
        .json({ message: "Invalid or already-used verification link." });
    }

    if (tokenDoc.expiresAt < new Date()) {
      await tokenDoc.deleteOne();
      return res.status(400).json({
        message:
          "This verification link has expired. Please request a new one.",
      });
    }

    const { userId } = tokenDoc;

    // Mark emailVerified = true on whichever collection holds this user
    const [j, h, e] = await Promise.all([
      Jobnode.findByIdAndUpdate(userId, { emailVerified: true }),
      Handyman.findByIdAndUpdate(userId, { emailVerified: true }),
      Employer.findByIdAndUpdate(userId, { emailVerified: true }),
    ]);

    if (!j && !h && !e) {
      return res.status(400).json({ message: "User account not found." });
    }

    // Delete the used token
    await tokenDoc.deleteOne();

    return res
      .status(200)
      .json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error("❌ verifyEmail:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/auth/resend-verification ───────────────────────────────────────
// Lets a logged-in user request a new verification email if theirs expired.
export const resendVerification = async (req, res) => {
  try {
    const { id, role } = req.user;
    const user = await findUserById(id, role);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    // Delete any existing verify tokens for this user
    await EmailToken.deleteMany({ userId: id, type: "email_verification" });

    const verifyToken = crypto.randomBytes(32).toString("hex");
    await EmailToken.create({
      userId: id,
      userModel: roleToUserModel(role), // required by EmailToken schema
      token: verifyToken,
      type: "email_verification", // must match schema enum
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    sendVerificationEmail(user.email, verifyToken).catch((err) =>
      console.error("⚠️  Resend verification email failed:", err.message),
    );

    return res.status(200).json({ message: "Verification email sent." });
  } catch (err) {
    console.error("❌ resendVerification:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── PATCH /api/auth/change-password ──────────────────────────────────────────
// For logged-in users changing their password from account settings.
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required." });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });
    }

    // Fetch the full user doc (needs .password which .lean() excludes via select)
    let user;
    if (role === "jobseeker") user = await Jobnode.findById(id);
    else if (role === "handyman") user = await Handyman.findById(id);
    else if (role === "employer") user = await Employer.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Sign out every other session — keep the one making this request alive
    const currentToken = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
    const currentHash = currentToken ? hashToken(currentToken) : null;
    await Session.deleteMany({ userId: id, tokenHash: { $ne: currentHash } });

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("❌ changePassword:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/auth/sessions ────────────────────────────────────────────────────
export const getSessions = async (req, res) => {
  try {
    const { id } = req.user;
    const currentToken = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
    const currentHash = currentToken ? hashToken(currentToken) : null;

    const sessions = await Session.find({
      userId: id,
      revoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastSeenAt: -1 })
      .lean();

    return res.status(200).json({
      sessions: sessions.map((s) => ({
        id: s._id,
        device: s.device,
        browser: s.browser,
        ip: s.ip,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        isCurrent: s.tokenHash === currentHash,
      })),
    });
  } catch (err) {
    console.error("❌ getSessions:", err);
    res.status(500).json({ message: "Failed to load sessions" });
  }
};

// ── DELETE /api/auth/sessions/:sessionId — revoke one other session ──────────
export const revokeSession = async (req, res) => {
  try {
    const { id } = req.user;
    const { sessionId } = req.params;

    const session = await Session.findOneAndDelete({ _id: sessionId, userId: id });
    if (!session) return res.status(404).json({ message: "Session not found" });

    return res.status(200).json({ message: "Session revoked" });
  } catch (err) {
    console.error("❌ revokeSession:", err);
    res.status(500).json({ message: "Failed to revoke session" });
  }
};

// ── DELETE /api/auth/sessions — revoke every OTHER session ────────────────────
export const revokeAllOtherSessions = async (req, res) => {
  try {
    const { id } = req.user;
    const currentToken = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
    const currentHash = currentToken ? hashToken(currentToken) : null;

    await Session.deleteMany({ userId: id, tokenHash: { $ne: currentHash } });
    return res.status(200).json({ message: "Signed out of all other sessions" });
  } catch (err) {
    console.error("❌ revokeAllOtherSessions:", err);
    res.status(500).json({ message: "Failed to revoke sessions" });
  }
};

// ── DELETE /api/auth/account  { password } ────────────────────────────────────
// Permanently deletes the account and its directly-owned records. Verifies the
// current password first since this is irreversible.
export const deleteAccount = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const Model = { jobseeker: Jobnode, handyman: Handyman, employer: Employer }[role];
    if (!Model) return res.status(400).json({ message: "Invalid account type" });

    const user = await Model.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    await Promise.all([
      Session.deleteMany({ userId: id }),
      EmailToken.deleteMany({ userId: id }),
      Notification.deleteMany({ recipientId: id }),
      JobseekerApplication.deleteMany({ jobseeker: id }),
      role === "employer" ? JobModel.deleteMany({ company: id }) : Promise.resolve(),
    ]);

    await Model.findByIdAndDelete(id);

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("❌ deleteAccount:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
};
