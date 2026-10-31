// routes/nudgeRoutes.js: public unsubscribe endpoint for reminder emails
import express from "express";
import mongoose from "mongoose";
import NudgeState from "../models/NudgeState.js";
import { verifyUnsubscribe } from "../utils/nudges.js";

const router = express.Router();
const MODELS = ["Jobnode", "Handyman", "Employer"];
const FRONTEND = process.env.FRONTEND_URL || "https://talenthq.buzz";

const page = (title, msg) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f9fafb;padding:48px 16px;color:#374151">
<div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center">
<h1 style="font-size:20px;color:#111827;margin:0 0 12px">${title}</h1><p style="margin:0 0 20px">${msg}</p>
<a href="${FRONTEND}" style="color:#004b23;font-weight:700">Go to TalentHQ</a></div></body></html>`;

async function unsubscribe(req, res) {
  // One-click POSTs from mail clients send the params in the URL query
  const { m, u, s } = req.query;
  if (!MODELS.includes(m) || !mongoose.isValidObjectId(u) || !verifyUnsubscribe(m, u, s)) {
    return res.status(400).send(page("Invalid link", "This unsubscribe link is invalid."));
  }
  try {
    await NudgeState.updateOne(
      { userId: u, userModel: m },
      { $set: { optedOut: true, optedOutAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    console.error("❌ nudge unsubscribe:", err);
    return res.status(500).send(page("Something went wrong", "Please try the link again in a moment."));
  }
  res.send(
    page(
      "You're unsubscribed",
      "You won't get any more reminder emails from TalentHQ. Account emails such as password resets and application updates will still arrive.",
    ),
  );
}

// GET = clicking the link; POST = Gmail/Outlook one-click unsubscribe
router.get("/unsubscribe", unsubscribe);
router.post("/unsubscribe", unsubscribe);

export default router;
