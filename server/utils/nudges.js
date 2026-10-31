// utils/nudges.js
// Re-engagement nudges. On every run (scripts/sendNudges.js, daily via cron)
// each user gets AT MOST ONE email, and never more often than every
// NUDGE_INTERVAL_DAYS (default 3). Priority per user:
//   1. Email not verified                  → verify nudge with a fresh 24h link
//   2. Jobseeker, verified, no application → "create your application" nudge
//   3. Jobseeker with an application       → new open jobs matching it (only if any)
// Verify/application nudges stop after NUDGE_MAX_REMINDERS so we don't nag
// forever. Users can unsubscribe through a signed link.
import crypto from "crypto";
import Jobnode from "../models/Jobnode.js";
import Handyman from "../models/Handyman.js";
import Employer from "../models/Employer.js";
import EmailToken from "../models/EmailToken.js";
import Job from "../models/job.model.js";
import Application from "../models/JobseekerApplication.js";
import NudgeState from "../models/NudgeState.js";
import {
  sendVerifyNudgeEmail,
  sendCreateApplicationNudgeEmail,
  sendJobMatchNudgeEmail,
} from "./email.js";

const DAY = 24 * 60 * 60 * 1000;
const num = (v, d) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

const INTERVAL_DAYS = num(process.env.NUDGE_INTERVAL_DAYS, 3);
const MAX_REMINDERS = num(process.env.NUDGE_MAX_REMINDERS, 6); // ≈ 18 days of reminders
const MAX_PER_RUN = num(process.env.NUDGE_MAX_PER_RUN, 80); // Resend free plan = 100/day
const GRACE_HOURS = 24; // don't nudge someone who signed up minutes ago
const SEND_DELAY_MS = 600; // stay under Resend's rate limit

const API_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.talenthq.buzz"
    : `http://localhost:${process.env.PORT || 5000}`);

// ── Signed unsubscribe links ───────────────────────────────────────────────
const sign = (userModel, userId) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET || "talenthq-nudge")
    .update(`nudge:${userModel}:${userId}`)
    .digest("hex")
    .slice(0, 32);

export function unsubscribeUrl(userModel, userId) {
  return `${API_URL}/api/nudges/unsubscribe?m=${userModel}&u=${userId}&s=${sign(userModel, userId)}`;
}

export function verifyUnsubscribe(userModel, userId, sig) {
  if (!userModel || !userId || typeof sig !== "string") return false;
  const expected = sign(userModel, userId);
  return (
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  );
}

// ── Job matching ───────────────────────────────────────────────────────────
const STOPWORDS = new Set(
  "and the for with role job jobs senior junior lead head intern officer assistant associate level entry mid any of in at to".split(
    " ",
  ),
);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function keywords(text = "") {
  return [
    ...new Set(
      String(text)
        .toLowerCase()
        .split(/[^a-z0-9+#]+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    ),
  ];
}

async function findMatchingJobs(applications, since) {
  const words = [...new Set(applications.flatMap((a) => keywords(a.roleTitle)))];
  if (!words.length) return [];
  const re = new RegExp(`\\b(${words.map(escapeRe).join("|")})`, "i");
  const locWords = applications.flatMap((a) => keywords(a.preferredLocation));

  const jobs = await Job.find({
    status: "open",
    jobFor: { $ne: "handyman" },
    createdAt: { $gt: since },
    $and: [
      { $or: [{ deadline: null }, { deadline: { $gte: new Date() } }] },
      { $or: [{ title: re }, { skills: re }, { category: re }] },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("company", "companyName")
    .lean();

  return jobs
    .map((j) => {
      let score = 0;
      for (const w of words) if (new RegExp(`\\b${escapeRe(w)}`, "i").test(j.title)) score += 3;
      if (re.test(j.skills || "") || re.test(j.category || "")) score += 1;
      const loc = `${j.location || ""} ${j.state || ""}`.toLowerCase();
      if (locWords.some((w) => loc.includes(w))) score += 1;
      return { ...j, score, companyName: j.company?.companyName };
    })
    .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
    .slice(0, 5);
}

// ── Decide what (if anything) a user should get ────────────────────────────
async function planFor(user, userModel, state) {
  if (!user.emailVerified) {
    if (state.counts.verify >= MAX_REMINDERS) return null;
    return { kind: "verify" };
  }
  if (userModel !== "Jobnode") return null;

  const apps = await Application.find({ jobseeker: user._id })
    .select("roleTitle preferredLocation createdAt")
    .sort({ createdAt: -1 })
    .lean();

  if (!apps.length) {
    if (state.counts.application >= MAX_REMINDERS) return null;
    return { kind: "application" };
  }

  // Only jobs newer than the last match email; on the first one, look back
  // to the earlier of (first application, 14 days ago).
  const firstApp = Math.min(...apps.map((a) => +a.createdAt));
  const since = state.lastJobMatchAt || new Date(Math.max(firstApp, Date.now() - 14 * DAY));
  const jobs = await findMatchingJobs(apps, since);
  if (!jobs.length) return null;
  return { kind: "jobMatch", jobs, roleTitle: apps[0].roleTitle };
}

async function send(user, userModel, plan) {
  const unsub = unsubscribeUrl(userModel, user._id);
  if (plan.kind === "verify") {
    // Earlier links have expired (24h): issue a fresh one, like resend-verification does
    await EmailToken.deleteMany({ userId: user._id, type: "email_verification" });
    const token = crypto.randomBytes(32).toString("hex");
    await EmailToken.create({
      userId: user._id,
      userModel,
      token,
      type: "email_verification",
      expiresAt: new Date(Date.now() + DAY),
    });
    return sendVerifyNudgeEmail(user.email, user.fullName, token, unsub);
  }
  if (plan.kind === "application") {
    return sendCreateApplicationNudgeEmail(user.email, user.fullName, unsub);
  }
  return sendJobMatchNudgeEmail(user.email, user.fullName, plan.roleTitle, plan.jobs, unsub);
}

// ── Main entry ─────────────────────────────────────────────────────────────
export async function runNudges({ dryRun = false, log = console.log } = {}) {
  const now = Date.now();
  const cutoff = new Date(now - INTERVAL_DAYS * DAY + 60 * 60 * 1000); // 1h slack for cron drift
  const signedUpBefore = new Date(now - GRACE_HOURS * 60 * 60 * 1000);
  const summary = { considered: 0, sent: 0, failed: 0, byKind: {}, dryRun };

  const sources = [
    { Model: Jobnode, userModel: "Jobnode" },
    { Model: Handyman, userModel: "Handyman" },
    { Model: Employer, userModel: "Employer" },
  ];

  for (const { Model, userModel } of sources) {
    // Handymen and employers only get the verify nudge
    const filter = { createdAt: { $lt: signedUpBefore } };
    if (userModel !== "Jobnode") filter.emailVerified = { $ne: true };

    const users = await Model.find(filter)
      .select("fullName email emailVerified createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const states = await NudgeState.find({
      userModel,
      userId: { $in: users.map((u) => u._id) },
    }).lean();
    const stateById = new Map(states.map((s) => [String(s.userId), s]));

    for (const user of users) {
      if (summary.sent >= MAX_PER_RUN) {
        log(`⏸  Reached NUDGE_MAX_PER_RUN (${MAX_PER_RUN}); the rest go out on the next run.`);
        return summary;
      }
      if (!user.email) continue;
      const state = stateById.get(String(user._id)) || {
        counts: { verify: 0, application: 0, jobMatch: 0 },
      };
      if (state.optedOut) continue;
      if (state.lastSentAt && state.lastSentAt > cutoff) continue;

      summary.considered++;
      const plan = await planFor(user, userModel, state);
      if (!plan) continue;

      const label = `${plan.kind.padEnd(11)} ${userModel.padEnd(8)} ${user.email}`;
      if (dryRun) {
        log(`[dry-run] ${label}${plan.jobs ? ` (${plan.jobs.length} jobs)` : ""}`);
        summary.sent++;
        summary.byKind[plan.kind] = (summary.byKind[plan.kind] || 0) + 1;
        continue;
      }

      try {
        await send(user, userModel, plan);
        await NudgeState.updateOne(
          { userId: user._id, userModel },
          {
            $set: {
              lastSentAt: new Date(),
              lastKind: plan.kind,
              ...(plan.kind === "jobMatch" ? { lastJobMatchAt: new Date() } : {}),
            },
            $inc: { [`counts.${plan.kind}`]: 1 },
          },
          { upsert: true },
        );
        summary.sent++;
        summary.byKind[plan.kind] = (summary.byKind[plan.kind] || 0) + 1;
        log(`✉️  ${label}`);
      } catch (err) {
        summary.failed++;
        log(`❌ ${label}: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
    }
  }
  return summary;
}
