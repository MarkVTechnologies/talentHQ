import express from "express";
import {
  getPlatformMetrics,
  getAllUsers,
  getUserById,
  updateUser,
  banUser,
  deleteUser,
  verifySuperAdmin,
  getAllJobs,
  getJobByIdAdmin,
  updateJobAdmin,
  deleteJobAdmin,
  getEmployerVerifications,
  updateEmployerVerification,
  resetEmployerVerification,
} from "../controllers/adminController.js";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js";
import {
  getUserAnalytics,
  getJobAnalytics,
  getSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView,
} from "../controllers/analyticsController.js";
import {
  getContactMessages,
  updateContactMessageStatus,
} from "../controllers/contactController.js";

const router = express.Router();

// All routes require superadmin Bearer token
router.use(verifySuperAdmin);

router.get("/metrics", getPlatformMetrics);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id/ban", banUser);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/contact-messages", getContactMessages);
router.patch("/contact-messages/:id", updateContactMessageStatus);

router.get("/jobs", getAllJobs);
router.get("/jobs/:id", getJobByIdAdmin);
router.patch("/jobs/:id", updateJobAdmin);
router.delete("/jobs/:id", deleteJobAdmin);

router.get("/employer-verifications", getEmployerVerifications);
router.patch("/employer-verifications/:id", updateEmployerVerification);
router.delete("/employer-verifications/:id", resetEmployerVerification);

router.get("/announcements", getAnnouncements);
router.get("/announcements/:id", getAnnouncementById);
router.post("/announcements", createAnnouncement);
router.patch("/announcements/:id", updateAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

router.get("/analytics/users", getUserAnalytics);
router.get("/analytics/jobs", getJobAnalytics);
router.get("/analytics/views", getSavedViews);
router.post("/analytics/views", createSavedView);
router.patch("/analytics/views/:id", updateSavedView);
router.delete("/analytics/views/:id", deleteSavedView);

export default router; // ← this was missing, caused the import crash
