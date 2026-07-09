// controllers/announcementController.js
import Announcement from "../models/Announcement.js";

// GET /api/superadmin/announcements?status=active&audience=all&search=&page=1&limit=20
export const getAnnouncements = async (req, res) => {
  try {
    const { status = "all", audience = "all", search = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status === "active") query.isActive = true;
    else if (status === "inactive") query.isActive = false;
    if (audience !== "all") query.audience = audience;
    if (search.trim()) query.title = { $regex: search.trim(), $options: "i" };

    const [announcements, total] = await Promise.all([
      Announcement.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Announcement.countDocuments(query),
    ]);

    return res.json({
      announcements,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("❌ Get announcements error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/superadmin/announcements/:id
export const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).lean();
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    return res.json({ announcement });
  } catch (err) {
    console.error("❌ Get announcement error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/superadmin/announcements
export const createAnnouncement = async (req, res) => {
  try {
    const { title, body, audience, priority, isActive, startsAt, expiresAt } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      body: body.trim(),
      audience: audience || "all",
      priority: priority || "info",
      isActive: isActive !== undefined ? !!isActive : true,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
      createdBy: req.admin.id,
    });

    return res.status(201).json({ message: "Announcement created", announcement });
  } catch (err) {
    console.error("❌ Create announcement error:", err);
    return res.status(500).json({ message: "Failed to create announcement" });
  }
};

// PATCH /api/superadmin/announcements/:id
export const updateAnnouncement = async (req, res) => {
  try {
    const { _id, __v, createdAt, updatedAt, createdBy, ...updates } = req.body;
    if (updates.title !== undefined && !updates.title.trim()) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }
    if (updates.body !== undefined && !updates.body.trim()) {
      return res.status(400).json({ message: "Body cannot be empty" });
    }

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    return res.json({ message: "Announcement updated", announcement });
  } catch (err) {
    console.error("❌ Update announcement error:", err);
    return res.status(500).json({ message: "Failed to update announcement" });
  }
};

// DELETE /api/superadmin/announcements/:id
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    return res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error("❌ Delete announcement error:", err);
    return res.status(500).json({ message: "Failed to delete announcement" });
  }
};

// GET /api/announcements/active?audience=employer — public, unauthenticated
export const getActiveAnnouncements = async (req, res) => {
  try {
    const { audience } = req.query;
    const now = new Date();
    const query = {
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    };
    if (audience && audience !== "all") {
      query.audience = { $in: [audience, "all"] };
    }

    const announcements = await Announcement.find(query)
      .select("title body audience priority createdAt")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({ announcements });
  } catch (err) {
    console.error("❌ Get active announcements error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
