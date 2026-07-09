// controllers/flagController.js
import Flag from "../models/Flag.js";

// ── POST /api/flags — authenticated user reports content ──────────────────────
export const createFlag = async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;

    if (!targetType || !targetId || !reason) {
      return res
        .status(400)
        .json({ message: "targetType, targetId and reason are required" });
    }

    const flag = await Flag.create({
      targetType,
      targetId,
      reporterId: req.user.id,
      reporterRole: req.user.role,
      reason,
      details: details?.trim() || "",
    });

    res
      .status(201)
      .json({ message: "Report submitted. Our team will review it.", flag });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "You have already reported this content." });
    }
    console.error("❌ createFlag:", err);
    res.status(500).json({ message: "Failed to submit report" });
  }
};

// ── GET /api/flags — superadmin lists all flags ───────────────────────────────
export const getFlags = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Superadmin only" });
    }

    const { status = "pending", targetType, page = 1, limit = 30 } = req.query;
    const query = {};
    if (status !== "all") query.status = status;
    if (targetType) {
      const types = targetType.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length === 1) query.targetType = types[0];
      else if (types.length > 1) query.targetType = { $in: types };
    }

    const [flags, total] = await Promise.all([
      Flag.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Flag.countDocuments(query),
    ]);

    res.json({ flags, total, page: Number(page) });
  } catch (err) {
    console.error("❌ getFlags:", err);
    res.status(500).json({ message: "Failed to fetch flags" });
  }
};

// ── PATCH /api/flags/:id/resolve — superadmin resolves a flag ─────────────────
export const resolveFlag = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Superadmin only" });
    }

    const { status, adminNote } = req.body;
    if (!["reviewed", "actioned", "dismissed"].includes(status)) {
      return res
        .status(400)
        .json({ message: "status must be reviewed | actioned | dismissed" });
    }

    const flag = await Flag.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNote: adminNote?.trim() || "",
        resolvedAt: new Date(),
        resolvedBy: req.user.id,
      },
      { new: true },
    );

    if (!flag) return res.status(404).json({ message: "Flag not found" });
    res.json({ message: `Flag marked as ${status}`, flag });
  } catch (err) {
    console.error("❌ resolveFlag:", err);
    res.status(500).json({ message: "Failed to resolve flag" });
  }
};

// ── GET /api/flags/count — pending count for admin badge ──────────────────────
export const getPendingCount = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Superadmin only" });
    }
    const count = await Flag.countDocuments({ status: "pending" });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
};

// ── DELETE /api/flags/:id — superadmin permanently deletes a report ──────────
export const deleteFlag = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Superadmin only" });
    }

    const flag = await Flag.findByIdAndDelete(req.params.id);
    if (!flag) return res.status(404).json({ message: "Flag not found" });
    res.json({ message: "Report deleted permanently" });
  } catch (err) {
    console.error("❌ deleteFlag:", err);
    res.status(500).json({ message: "Failed to delete report" });
  }
};
