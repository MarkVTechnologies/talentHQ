// controllers/adminController.js
import Jobnode from "../models/Jobnode.js";
import Handyman from "../models/Handyman.js";
import Employer from "../models/Employer.js";
import JobModel from "../models/job.model.js";
import JobseekerApplication from "../models/JobseekerApplication.js";
import ContactMessage from "../models/ContactMessage.js";

// ── Middleware: verify superadmin from localStorage-issued token ─────────────
// The superadmin uses a Bearer token (not a cookie). verifyToken checks cookies.
// We use a separate lightweight check here.
import jwt from "jsonwebtoken";

export const verifySuperAdmin = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden — superadmin only" });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// GET /api/superadmin/metrics
export const getPlatformMetrics = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalJobseekers,
      totalHandymen,
      totalEmployers,
      totalJobs,
      totalApplications,
      newJobseekers,
      newHandymen,
      newEmployers,
      unreadMessages,
    ] = await Promise.all([
      Jobnode.countDocuments(),
      Handyman.countDocuments(),
      Employer.countDocuments(),
      JobModel.countDocuments(),
      JobseekerApplication.countDocuments(),
      Jobnode.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Handyman.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Employer.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      ContactMessage.countDocuments({ status: "unread" }).catch(() => 0),
    ]);

    const totalUsers = totalJobseekers + totalHandymen + totalEmployers;
    const newUsersLast7Days = newJobseekers + newHandymen + newEmployers;

    return res.json({
      totalUsers,
      totalJobseekers,
      totalHandymen,
      totalEmployers,
      totalJobs,
      activeJobs: totalJobs, // extend with status filter when status field is added
      totalApplications,
      newUsersLast7Days,
      unreadContactMessages: unreadMessages,
    });
  } catch (err) {
    console.error("❌ Metrics error:", err);
    return res.status(500).json({ message: "Failed to fetch metrics" });
  }
};

// GET /api/superadmin/users?role=jobseeker&search=&page=1&limit=10
export const getAllUsers = async (req, res) => {
  try {
    const { role, search = "", page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const buildQuery = (searchStr, forRole) => {
      if (!searchStr.trim()) return {};
      const re = new RegExp(searchStr.trim(), "i");
      const or = [{ fullName: re }, { email: re }];
      if (forRole === "employer") or.push({ companyName: re });
      return { $or: or };
    };

    let users = [];
    let total = 0;

    if (!role || role === "all") {
      const baseQ = buildQuery(search, "all");
      const [seekers, handymen, employers] = await Promise.all([
        Jobnode.find(baseQ).select("fullName email role emailVerified activePlan createdAt banned").lean(),
        Handyman.find(baseQ).select("fullName email role emailVerified activePlan createdAt banned").lean(),
        Employer.find(baseQ).select("fullName email companyName role emailVerified activePlan createdAt banned").lean(),
      ]);
      const all = [...seekers, ...handymen, ...employers].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      total = all.length;
      users = all.slice(skip, skip + limitNum);
    } else if (role === "jobseeker") {
      const query = buildQuery(search, "jobseeker");
      total = await Jobnode.countDocuments(query);
      users = await Jobnode.find(query)
        .select("fullName email avatar headline location phone emailVerified onboardingComplete activePlan role createdAt banned")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
    } else if (role === "handyman") {
      const query = buildQuery(search, "handyman");
      total = await Handyman.countDocuments(query);
      users = await Handyman.find(query)
        .select("fullName email avatar trade location yearsExperience emailVerified onboardingComplete activePlan role createdAt banned")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
    } else if (role === "employer") {
      const query = buildQuery(search, "employer");
      total = await Employer.countDocuments(query);
      users = await Employer.find(query)
        .select("fullName email companyName industry state logo emailVerified onboardingComplete activePlan role createdAt banned")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
    } else {
      return res.status(400).json({ message: "Invalid role filter" });
    }

    return res.json({
      users,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("❌ Get users error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/superadmin/users/:id/ban  { banned: true|false, role: "jobseeker" }
export const banUser = async (req, res) => {
  try {
    const { banned, role } = req.body;
    const { id } = req.params;

    if (typeof banned !== "boolean") {
      return res.status(400).json({ message: "banned must be a boolean" });
    }

    let Model;
    // Try all models if role not provided
    const tryModels = [Jobnode, Handyman, Employer];
    let updated = null;

    for (const M of tryModels) {
      updated = await M.findByIdAndUpdate(id, { banned }, { new: true }).select(
        "fullName email role banned",
      );
      if (updated) break;
    }

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: `User ${banned ? "banned" : "unbanned"} successfully`,
      user: updated,
    });
  } catch (err) {
    console.error("❌ Ban user error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/superadmin/users/:id  — hard delete (use with care)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const tryModels = [Jobnode, Handyman, Employer];
    let deleted = false;

    for (const M of tryModels) {
      const result = await M.findByIdAndDelete(id);
      if (result) {
        deleted = true;
        break;
      }
    }

    if (!deleted) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/superadmin/users/:id?role=employer|handyman|jobseeker
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.query;
    const MODELS = { jobseeker: Jobnode, handyman: Handyman, employer: Employer };

    let user = null;
    if (role && MODELS[role]) {
      user = await MODELS[role].findById(id).select("-password -__v").lean();
    } else {
      for (const M of [Jobnode, Handyman, Employer]) {
        user = await M.findById(id).select("-password -__v").lean();
        if (user) break;
      }
    }

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    console.error("❌ Get user by id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── Superadmin Job CRUD ───────────────────────────────────────────────────────

// GET /api/superadmin/jobs?search=&status=&page=1&limit=20
export const getAllJobs = async (req, res) => {
  try {
    const { search = "", status = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { location: { $regex: search.trim(), $options: "i" } },
      ];
    }
    if (status && status !== "all") query.status = status;

    const [jobs, total] = await Promise.all([
      JobModel.find(query)
        .populate("company", "companyName logo industry location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      JobModel.countDocuments(query),
    ]);

    return res.json({ jobs, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error("❌ getAllJobs admin:", err);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// GET /api/superadmin/jobs/:id
export const getJobByIdAdmin = async (req, res) => {
  try {
    const job = await JobModel.findById(req.params.id)
      .populate("company", "companyName logo industry location")
      .lean();
    if (!job) return res.status(404).json({ message: "Job not found" });
    return res.json({ job });
  } catch (err) {
    console.error("❌ getJobByIdAdmin:", err);
    return res.status(500).json({ message: "Failed to fetch job" });
  }
};

// PATCH /api/superadmin/jobs/:id
export const updateJobAdmin = async (req, res) => {
  try {
    const { _id, __v, createdAt, updatedAt, company, postedBy, ...updates } = req.body;
    const job = await JobModel.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: false },
    )
      .populate("company", "companyName logo industry location")
      .lean();
    if (!job) return res.status(404).json({ message: "Job not found" });
    return res.json({ message: "Job updated successfully", job });
  } catch (err) {
    console.error("❌ updateJobAdmin:", err);
    return res.status(500).json({ message: "Failed to update job" });
  }
};

// DELETE /api/superadmin/jobs/:id
export const deleteJobAdmin = async (req, res) => {
  try {
    const job = await JobModel.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    return res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("❌ deleteJobAdmin:", err);
    return res.status(500).json({ message: "Failed to delete job" });
  }
};

// ── Employer identity verification queue ──────────────────────────────────────
// An employer's `cacNumber` is self-declared at signup. `verificationStatus`
// tracks whether an admin has actually reviewed it. Older employers who typed
// a CAC number before this feature existed have no explicit status yet, so we
// treat "unverified + has a CAC number" as an implicit "pending" bucket —
// this surfaces their submissions in the review queue with no migration needed.
const cacProvided = { cacNumber: { $exists: true, $ne: "" } };
const noStatusYet = {
  $or: [{ verificationStatus: { $exists: false } }, { verificationStatus: "unverified" }],
};

export const employerVerificationBucketQuery = (bucket) => {
  if (bucket === "pending") return { $and: [noStatusYet, cacProvided] };
  if (bucket === "unverified") {
    return { $and: [noStatusYet, { $or: [{ cacNumber: { $exists: false } }, { cacNumber: "" }] }] };
  }
  if (bucket === "verified") return { verificationStatus: "verified" };
  if (bucket === "rejected") return { verificationStatus: "rejected" };
  return {}; // "all"
};

// GET /api/superadmin/employer-verifications?status=pending&search=&page=1&limit=20
export const getEmployerVerifications = async (req, res) => {
  try {
    const { status = "pending", search = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = employerVerificationBucketQuery(status);
    if (search.trim()) {
      const re = new RegExp(search.trim(), "i");
      query.$and = [...(query.$and || []), { $or: [{ fullName: re }, { email: re }, { companyName: re }] }];
    }

    const [employers, total, pendingCount, verifiedCount, rejectedCount, unverifiedCount, allCount] =
      await Promise.all([
        Employer.find(query)
          .select(
            "fullName email companyName companyEmail industry state logo cacNumber verificationStatus verificationNote verifiedAt createdAt",
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Employer.countDocuments(query),
        Employer.countDocuments(employerVerificationBucketQuery("pending")),
        Employer.countDocuments(employerVerificationBucketQuery("verified")),
        Employer.countDocuments(employerVerificationBucketQuery("rejected")),
        Employer.countDocuments(employerVerificationBucketQuery("unverified")),
        Employer.countDocuments({}),
      ]);

    return res.json({
      employers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      counts: {
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
        unverified: unverifiedCount,
        all: allCount,
      },
    });
  } catch (err) {
    console.error("❌ Get employer verifications error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/superadmin/employer-verifications/:id  { status, note }
export const updateEmployerVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note = "" } = req.body;
    const VALID = ["unverified", "pending", "verified", "rejected"];
    if (!VALID.includes(status)) {
      return res.status(400).json({ message: "Invalid verification status" });
    }

    const update = {
      verificationStatus: status,
      verificationNote: note,
      verifiedAt: status === "verified" ? new Date() : null,
      verifiedBy: ["verified", "rejected"].includes(status) ? req.admin.id : null,
    };

    const employer = await Employer.findByIdAndUpdate(id, { $set: update }, { new: true })
      .select("-password -__v")
      .lean();

    if (!employer) return res.status(404).json({ message: "Employer not found" });
    return res.json({ message: `Employer marked as ${status}`, employer });
  } catch (err) {
    console.error("❌ Update employer verification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/superadmin/employer-verifications/:id — revoke back to unverified
export const resetEmployerVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const employer = await Employer.findByIdAndUpdate(
      id,
      { $set: { verificationStatus: "unverified", verificationNote: "", verifiedAt: null, verifiedBy: null } },
      { new: true },
    )
      .select("-password -__v")
      .lean();

    if (!employer) return res.status(404).json({ message: "Employer not found" });
    return res.json({ message: "Verification reset", employer });
  } catch (err) {
    console.error("❌ Reset employer verification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/superadmin/users/:id  { role, ...fields }
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Strip fields that must not be overwritten
    const { role, _id, __v, createdAt, updatedAt, oauthProvider, oauthId, password, ...updates } = req.body;

    const MODELS = { jobseeker: Jobnode, handyman: Handyman, employer: Employer };
    let updated = null;

    if (role && MODELS[role]) {
      updated = await MODELS[role]
        .findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: false })
        .select("-password -__v")
        .lean();
    } else {
      for (const M of [Jobnode, Handyman, Employer]) {
        updated = await M
          .findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: false })
          .select("-password -__v")
          .lean();
        if (updated) break;
      }
    }

    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User updated successfully", user: updated });
  } catch (err) {
    console.error("❌ Update user error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
