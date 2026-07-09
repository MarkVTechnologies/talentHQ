// routes/announcementRoutes.js — public, read-only feed consumed by client UIs
import express from "express";
import { getActiveAnnouncements } from "../controllers/announcementController.js";

const router = express.Router();

router.get("/active", getActiveAnnouncements);

export default router;
