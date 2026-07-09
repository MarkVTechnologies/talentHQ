// routes/superAdminRoutes.js
import express from "express";
import {
  registerSuperAdmin,
  createSuperAdmin,
  getAllSuperAdmins,
  updateSuperAdmin,
  deleteSuperAdmin,
  getOwnProfile,
  updateOwnProfile,
  changeOwnPassword,
  loginSuperAdmin,
  refreshSuperAdminToken,
  logoutSuperAdmin,
  forgotPassword,
  resetPassword,
  verifySuperAdminToken,
} from "../controllers/superAdminController.js";
import { verifySuperAdmin } from "../controllers/adminController.js";
import { authLimiter } from "../middlewares/rateLimiters.js";

const router = express.Router();

// authLimiter only guards credential-guessing surfaces here — GET /verify
// below is called on every admin page load by useSuperAdminAuthRedirect and
// must never share that budget (a 429 there gets treated as an invalid
// session and force-logs the admin out).

// Bootstrap-only: works once, to create the FIRST super admin (requires
// SUPERADMIN_SIGNUP_SECRET and only when no admins exist yet). Self-closes after.
router.post("/signup", authLimiter, registerSuperAdmin);

// Add ADDITIONAL super admins — requires an authenticated super admin.
router.post("/admins", verifySuperAdmin, createSuperAdmin);
router.get("/admins", verifySuperAdmin, getAllSuperAdmins);
router.patch("/admins/:id", verifySuperAdmin, updateSuperAdmin);
router.delete("/admins/:id", verifySuperAdmin, deleteSuperAdmin);

// The logged-in admin's own profile
router.get("/me", verifySuperAdmin, getOwnProfile);
router.patch("/me", verifySuperAdmin, updateOwnProfile);
router.patch("/me/password", verifySuperAdmin, changeOwnPassword);

router.post("/login", authLimiter, loginSuperAdmin);
router.post("/refresh-token", refreshSuperAdminToken);
router.post("/logout", logoutSuperAdmin);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// Lightweight token check used by the client-side auth redirect hook
router.get("/verify", verifySuperAdminToken);

export default router;
