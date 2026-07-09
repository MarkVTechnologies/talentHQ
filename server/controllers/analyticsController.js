// controllers/analyticsController.js
import Jobnode from "../models/Jobnode.js";
import Handyman from "../models/Handyman.js";
import Employer from "../models/Employer.js";
import JobModel from "../models/job.model.js";
import JobseekerApplication from "../models/JobseekerApplication.js";
import SavedAnalyticsView from "../models/SavedAnalyticsView.js";
import { employerVerificationBucketQuery } from "./adminController.js";

const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };

function buildDateRange(days) {
  const dates = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Daily signup/creation counts for one model over the trailing `days` window.
async function dailySeries(Model, days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
  ]);
  return rows.map((r) => ({ date: r._id, count: r.count }));
}

// Fills gaps so every date in the range appears, even with zero activity.
function mergeSeries(dateRange, seriesMap) {
  const keys = Object.keys(seriesMap);
  return dateRange.map((date) => {
    const row = { date };
    for (const key of keys) {
      const found = seriesMap[key].find((r) => r.date === date);
      row[key] = found ? found.count : 0;
    }
    return row;
  });
}

function aggToObject(agg) {
  return agg.reduce((acc, r) => ({ ...acc, [r._id || "unspecified"]: r.count }), {});
}

// GET /api/superadmin/analytics/users?range=30d
export const getUserAnalytics = async (req, res) => {
  try {
    const { range = "30d" } = req.query;
    const days = RANGE_DAYS[range] || 30;
    const dateRange = buildDateRange(days);

    const [
      jobseekerSeries,
      handymanSeries,
      employerSeries,
      totalJobseekers,
      totalHandymen,
      totalEmployers,
      jobseekerFree,
      handymanFree,
      employerFree,
      jobseekerVerifiedEmail,
      handymanVerifiedEmail,
      employerVerifiedEmail,
      jobseekerOnboarded,
      handymanOnboarded,
      employerOnboarded,
      verifUnverified,
      verifPending,
      verifVerified,
      verifRejected,
    ] = await Promise.all([
      dailySeries(Jobnode, days),
      dailySeries(Handyman, days),
      dailySeries(Employer, days),
      Jobnode.countDocuments(),
      Handyman.countDocuments(),
      Employer.countDocuments(),
      Jobnode.countDocuments({ activePlan: { $regex: /_free$/ } }),
      Handyman.countDocuments({ activePlan: { $regex: /_free$/ } }),
      Employer.countDocuments({ activePlan: { $regex: /_free$/ } }),
      Jobnode.countDocuments({ emailVerified: true }),
      Handyman.countDocuments({ emailVerified: true }),
      Employer.countDocuments({ emailVerified: true }),
      Jobnode.countDocuments({ onboardingComplete: true }),
      Handyman.countDocuments({ onboardingComplete: true }),
      Employer.countDocuments({ onboardingComplete: true }),
      Employer.countDocuments(employerVerificationBucketQuery("unverified")),
      Employer.countDocuments(employerVerificationBucketQuery("pending")),
      Employer.countDocuments(employerVerificationBucketQuery("verified")),
      Employer.countDocuments(employerVerificationBucketQuery("rejected")),
    ]);

    return res.json({
      signupsOverTime: mergeSeries(dateRange, {
        jobseeker: jobseekerSeries,
        handyman: handymanSeries,
        employer: employerSeries,
      }),
      totals: {
        jobseeker: totalJobseekers,
        handyman: totalHandymen,
        employer: totalEmployers,
      },
      planBreakdown: {
        jobseeker: { free: jobseekerFree, paid: totalJobseekers - jobseekerFree },
        handyman: { free: handymanFree, paid: totalHandymen - handymanFree },
        employer: { free: employerFree, paid: totalEmployers - employerFree },
      },
      onboardingFunnel: {
        jobseeker: { total: totalJobseekers, emailVerified: jobseekerVerifiedEmail, onboarded: jobseekerOnboarded },
        handyman: { total: totalHandymen, emailVerified: handymanVerifiedEmail, onboarded: handymanOnboarded },
        employer: { total: totalEmployers, emailVerified: employerVerifiedEmail, onboarded: employerOnboarded },
      },
      employerVerificationFunnel: {
        unverified: verifUnverified,
        pending: verifPending,
        verified: verifVerified,
        rejected: verifRejected,
      },
    });
  } catch (err) {
    console.error("❌ getUserAnalytics:", err);
    return res.status(500).json({ message: "Failed to compute user analytics" });
  }
};

// GET /api/superadmin/analytics/jobs?range=30d
export const getJobAnalytics = async (req, res) => {
  try {
    const { range = "30d" } = req.query;
    const days = RANGE_DAYS[range] || 30;
    const dateRange = buildDateRange(days);

    const [
      jobsSeries,
      applicationsSeries,
      statusAgg,
      jobForAgg,
      typeAgg,
      categoryAgg,
      applicationStatusAgg,
      applicantRoleAgg,
      totalJobs,
      totalApplications,
    ] = await Promise.all([
      dailySeries(JobModel, days),
      dailySeries(JobseekerApplication, days),
      JobModel.aggregate([
        { $group: { _id: { $ifNull: ["$status", "open"] }, count: { $sum: 1 } } },
      ]),
      JobModel.aggregate([{ $group: { _id: "$jobFor", count: { $sum: 1 } } }]),
      JobModel.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
      JobModel.aggregate([
        { $group: { _id: { $ifNull: ["$category", "Uncategorized"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      JobseekerApplication.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      JobseekerApplication.aggregate([{ $group: { _id: "$applicantRole", count: { $sum: 1 } } }]),
      JobModel.countDocuments(),
      JobseekerApplication.countDocuments(),
    ]);

    return res.json({
      jobsOverTime: mergeSeries(dateRange, { jobs: jobsSeries }),
      applicationsOverTime: mergeSeries(dateRange, { applications: applicationsSeries }),
      statusBreakdown: aggToObject(statusAgg),
      jobForBreakdown: aggToObject(jobForAgg),
      typeBreakdown: aggToObject(typeAgg),
      categoryBreakdown: categoryAgg.map((r) => ({
        category: r._id || "Uncategorized",
        count: r.count,
      })),
      applicationFunnel: aggToObject(applicationStatusAgg),
      applicantRoleBreakdown: aggToObject(applicantRoleAgg),
      totals: { jobs: totalJobs, applications: totalApplications },
    });
  } catch (err) {
    console.error("❌ getJobAnalytics:", err);
    return res.status(500).json({ message: "Failed to compute job analytics" });
  }
};

// ── Saved analytics views (full CRUD) ─────────────────────────────────────────
// A pinned combination of page + date range an admin wants to jump back to —
// the one genuinely CRUD-able resource on an otherwise read-only analytics page.

// GET /api/superadmin/analytics/views?page=users
export const getSavedViews = async (req, res) => {
  try {
    const { page } = req.query;
    const query = page && page !== "all" ? { page } : {};
    const views = await SavedAnalyticsView.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ views });
  } catch (err) {
    console.error("❌ getSavedViews:", err);
    return res.status(500).json({ message: "Failed to load saved views" });
  }
};

// POST /api/superadmin/analytics/views  { name, page, range }
export const createSavedView = async (req, res) => {
  try {
    const { name, page, range } = req.body;
    if (!name?.trim() || !["users", "jobs"].includes(page)) {
      return res.status(400).json({ message: "A name and a valid page (users|jobs) are required" });
    }
    const view = await SavedAnalyticsView.create({
      name: name.trim(),
      page,
      range: RANGE_DAYS[range] ? range : "30d",
      createdBy: req.admin.id,
    });
    return res.status(201).json({ message: "View saved", view });
  } catch (err) {
    console.error("❌ createSavedView:", err);
    return res.status(500).json({ message: "Failed to save view" });
  }
};

// PATCH /api/superadmin/analytics/views/:id  { name?, range? }
export const updateSavedView = async (req, res) => {
  try {
    const { name, range } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "Name cannot be empty" });
      updates.name = name.trim();
    }
    if (range !== undefined) {
      if (!RANGE_DAYS[range]) return res.status(400).json({ message: "Invalid range" });
      updates.range = range;
    }

    const view = await SavedAnalyticsView.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!view) return res.status(404).json({ message: "Saved view not found" });
    return res.json({ message: "View updated", view });
  } catch (err) {
    console.error("❌ updateSavedView:", err);
    return res.status(500).json({ message: "Failed to update view" });
  }
};

// DELETE /api/superadmin/analytics/views/:id
export const deleteSavedView = async (req, res) => {
  try {
    const view = await SavedAnalyticsView.findByIdAndDelete(req.params.id);
    if (!view) return res.status(404).json({ message: "Saved view not found" });
    return res.json({ message: "Saved view deleted" });
  } catch (err) {
    console.error("❌ deleteSavedView:", err);
    return res.status(500).json({ message: "Failed to delete view" });
  }
};
