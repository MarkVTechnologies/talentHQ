// server/routes/auth.js
import express from "express";
import {
  signup2,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  deleteAccount,
} from "../controllers/authController.js";
import { verifyToken } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rateLimiters.js";

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
// authLimiter only guards credential-guessing surfaces here — GET /me below
// is called on every page load by AuthContext and must never share that budget.
router.post("/signup2", authLimiter, signup2);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.get("/verify-email", verifyEmail);

// ── Protected routes (JWT cookie required) ────────────────────────────────────
router.get("/me", verifyToken, getMe);
router.post("/resend-verification", verifyToken, resendVerification);
router.patch("/change-password", verifyToken, changePassword);

router.get("/sessions", verifyToken, getSessions);
router.delete("/sessions/:sessionId", verifyToken, revokeSession);
router.delete("/sessions", verifyToken, revokeAllOtherSessions);
router.delete("/account", verifyToken, deleteAccount);

export default router;
