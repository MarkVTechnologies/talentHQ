// server/utils/email.js
// Uses Resend (https://resend.com) — reliable transactional email API.
import { Resend } from "resend";

// ── Lazy Resend initialisation ─────────────────────────────────────────────
let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set. Add it to your .env file.");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "TalentHQ <noreply@talenthq.buzz>";

// FIX: was "talenthq.netlify.app" — now correctly defaults to talenthq.buzz
const FRONTEND =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://talenthq.buzz"
    : "http://localhost:3000");

// ── Shared HTML wrapper ────────────────────────────────────────────────────
function emailHtml(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TalentHQ</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f9fafb;
      padding: 40px 16px;
      color: #374151;
    }
    .wrapper {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .header {
      background-color: #004b23;
      padding: 24px 32px;
    }
    .logo {
      font-size: 22px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .logo-accent { color: #7fba00; }
    .body {
      padding: 32px;
      line-height: 1.65;
    }
    .body h1 {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      margin-bottom: 12px;
    }
    .body p {
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 16px;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #004b23;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 15px;
      margin: 8px 0 24px;
    }
    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    .detail-label {
      color: #9ca3af;
      font-weight: 600;
      min-width: 90px;
      flex-shrink: 0;
    }
    .detail-value {
      color: #111827;
      font-weight: 500;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    .status-accepted { background: #dcfce7; color: #166534; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-reviewed { background: #dbeafe; color: #1e40af; }
    .status-pending  { background: #f3f4f6; color: #374151; }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #004b23;
      color: #fff;
      font-weight: 800;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-text {
      font-size: 14px;
      color: #374151;
      padding-top: 4px;
    }
    .divider {
      border: none;
      border-top: 1px solid #f3f4f6;
      margin: 20px 0;
    }
    .note {
      font-size: 13px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .link-fallback {
      font-size: 12px;
      color: #9ca3af;
      word-break: break-all;
    }
    .callout {
      background: #f0fdf4;
      border-left: 3px solid #004b23;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
      font-size: 14px;
      color: #374151;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Talent<span class="logo-accent">HQ</span></div>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      © 2025 TalentHQ Nigeria · Lagos, Nigeria<br />
      <span style="color:#d1d5db">You're receiving this because you have an account on TalentHQ.</span>
    </div>
  </div>
</body>
</html>`;
}

// ── Internal send helper ───────────────────────────────────────────────────
async function sendEmail({ to, subject, html, headers }) {
  // Replies to system emails (verify, reset, welcome, status, interview) should
  // reach a monitored inbox rather than the unmonitored noreply@ from-address.
  const REPLY_TO = process.env.ADMIN_EMAIL || "hello@talenthq.buzz";

  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    reply_to: REPLY_TO,
    subject,
    html,
    ...(headers ? { headers } : {}),
  });

  if (error) {
    console.error("❌ Resend send error:", JSON.stringify(error));
    throw new Error(
      `Email delivery failed: ${error.message || JSON.stringify(error)}`,
    );
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`📧 Email sent → ${to} | id: ${data?.id}`);
  }

  return data;
}

// ── Email verification ─────────────────────────────────────────────────────
export async function sendVerificationEmail(to, token) {
  const link = `${FRONTEND}/verify-email?token=${token}`;

  return sendEmail({
    to,
    subject: "Verify your TalentHQ email address",
    html: emailHtml(`
      <h1>Confirm your email</h1>
      <p>
        Thanks for signing up! Click the button below to verify your email
        address and fully activate your TalentHQ account.
      </p>
      <a href="${link}" class="btn">Verify Email Address</a>
      <hr class="divider" />
      <p class="note">This link expires in <strong>24 hours</strong>.</p>
      <p class="note">
        If you didn't create a TalentHQ account, you can safely ignore this email —
        no action is needed.
      </p>
      <p class="link-fallback">
        Link not working? Copy and paste this into your browser:<br />${link}
      </p>
    `),
  });
}

// ── Password reset ─────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(to, token) {
  const link = `${FRONTEND}/reset-password?token=${token}`;

  return sendEmail({
    to,
    subject: "Reset your TalentHQ password",
    html: emailHtml(`
      <h1>Reset your password</h1>
      <p>
        We received a request to reset the password for your TalentHQ account.
        Click the button below to choose a new password.
      </p>
      <a href="${link}" class="btn">Reset Password</a>
      <hr class="divider" />
      <p class="note">This link expires in <strong>1 hour</strong>.</p>
      <p class="note">
        If you didn't request a password reset, you can safely ignore this email.
        Your password will not change.
      </p>
      <p class="link-fallback">
        Link not working? Copy and paste this into your browser:<br />${link}
      </p>
    `),
  });
}

// ── Welcome email (sent after signup) ─────────────────────────────────────
export async function sendWelcomeEmail(to, fullName, role) {
  const firstName = fullName.split(" ")[0] || fullName;

  const roleSteps = {
    jobseeker: [
      "Complete your profile — add your headline, skills, and upload your CV",
      "Browse thousands of jobs across Nigeria and apply in one click",
      "Track all your applications and interview invites in your dashboard",
    ],
    handyman: [
      "Complete your profile — add your trade, years of experience, and location",
      "Browse jobs posted by employers looking for your skills",
      "Respond to interview invites directly from your dashboard",
    ],
    employer: [
      "Post your first job listing — it takes under 2 minutes",
      "Browse our candidate database to find the right hire",
      "Manage applications and schedule interviews from one place",
    ],
  };

  const dashboardPath = {
    jobseeker: "/dashboard/jobseeker",
    handyman: "/dashboard/handyman",
    employer: "/dashboard/employer",
  };

  const steps = roleSteps[role] || roleSteps.jobseeker;
  const dashLink = `${FRONTEND}${dashboardPath[role] || "/dashboard/jobseeker"}`;

  const stepsHtml = steps
    .map(
      (step, i) => `
      <div class="step">
        <div class="step-num">${i + 1}</div>
        <div class="step-text">${step}</div>
      </div>`,
    )
    .join("");

  return sendEmail({
    to,
    subject: `Welcome to TalentHQ, ${firstName}! 🎉`,
    html: emailHtml(`
      <h1>Welcome, ${firstName}!</h1>
      <p>
        Your TalentHQ account is ready. Here's how to get started:
      </p>
      ${stepsHtml}
      <br />
      <a href="${dashLink}" class="btn">Go to My Dashboard</a>
      <hr class="divider" />
      <p class="note">
        Need help? Reply to this email or visit
        <a href="${FRONTEND}/reach-us" style="color:#004b23;">talenthq.buzz/reach-us</a>
      </p>
    `),
  });
}

// ── Application status change email ───────────────────────────────────────
// Sent to the jobseeker when an employer updates their application status.
export async function sendApplicationStatusEmail(
  to,
  { applicantName, roleTitle, status, employerMessage },
) {
  const firstName = applicantName.split(" ")[0] || applicantName;
  const dashLink = `${FRONTEND}/dashboard/jobseeker/applications`;

  const statusConfig = {
    accepted: {
      subject: `🎉 Great news — your application for "${roleTitle}" was accepted`,
      badge: `<span class="status-badge status-accepted">✓ Accepted</span>`,
      headline: `Good news, ${firstName}!`,
      body: `Your application for the <strong>${roleTitle}</strong> position has been <strong>accepted</strong>. The employer will be in touch with next steps.`,
      cta: "View Your Applications",
    },
    rejected: {
      subject: `Update on your application for "${roleTitle}"`,
      badge: `<span class="status-badge status-rejected">Not selected</span>`,
      headline: `Application update`,
      body: `Thank you for applying for <strong>${roleTitle}</strong>. After careful review, the employer has decided not to move forward with your application at this time. Don't be discouraged — keep applying, ${firstName}!`,
      cta: "Browse More Jobs",
    },
    reviewed: {
      subject: `Your application for "${roleTitle}" is being reviewed`,
      badge: `<span class="status-badge status-reviewed">Under Review</span>`,
      headline: `Your application is being reviewed`,
      body: `An employer is currently reviewing your application for <strong>${roleTitle}</strong>. We'll notify you as soon as there's an update.`,
      cta: "View Your Applications",
    },
    pending: {
      subject: `Application update for "${roleTitle}"`,
      badge: `<span class="status-badge status-pending">Updated</span>`,
      headline: `Application status updated`,
      body: `Your application for <strong>${roleTitle}</strong> has been updated.`,
      cta: "View Your Applications",
    },
  };

  const cfg = statusConfig[status] || statusConfig.pending;

  const messageSection = employerMessage
    ? `<div class="callout"><strong>Message from employer:</strong><br />${employerMessage}</div>`
    : "";

  return sendEmail({
    to,
    subject: cfg.subject,
    html: emailHtml(`
      <h1>${cfg.headline}</h1>
      ${cfg.badge}
      <p>${cfg.body}</p>
      ${messageSection}
      <a href="${dashLink}" class="btn">${cfg.cta}</a>
      <hr class="divider" />
      <p class="note">
        You can view all your applications and their statuses in your
        <a href="${dashLink}" style="color:#004b23;">jobseeker dashboard</a>.
      </p>
    `),
  });
}

// ── Interview scheduled email ──────────────────────────────────────────────
// Sent to the jobseeker/handyman when an employer schedules an interview.
export async function sendInterviewScheduledEmail(
  to,
  {
    applicantName,
    companyName,
    interviewTitle,
    date,
    time,
    timezone,
    format,
    location,
    platform,
    notes,
  },
) {
  const firstName = applicantName.split(" ")[0] || applicantName;
  const dashLink = `${FRONTEND}/dashboard/jobseeker/interviews`;

  const formatLabel = {
    video: "Video Call",
    phone: "Phone Call",
    "in-person": "In Person",
  };
  const fmtDisplay = formatLabel[format] || format;

  const dateDisplay = new Date(date).toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const locationLine =
    format === "video"
      ? platform
        ? `<div class="detail-row"><span class="detail-label">Platform</span><span class="detail-value">${platform}</span></div>`
        : ""
      : location
        ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${location}</span></div>`
        : "";

  const notesSection = notes
    ? `<div class="callout"><strong>Notes from employer:</strong><br />${notes}</div>`
    : "";

  return sendEmail({
    to,
    subject: `📅 Interview invitation from ${companyName}`,
    html: emailHtml(`
      <h1>You have an interview, ${firstName}!</h1>
      <p>
        <strong>${companyName}</strong> has invited you to an interview for
        <strong>${interviewTitle}</strong>. Please confirm your attendance below.
      </p>

      <div style="background:#f9fafb;border-radius:10px;padding:16px;margin:20px 0;">
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${dateDisplay}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${time} (${timezone || "Africa/Lagos"})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Format</span>
          <span class="detail-value">${fmtDisplay}</span>
        </div>
        ${locationLine}
      </div>

      ${notesSection}

      <a href="${dashLink}" class="btn">Confirm or Decline Interview</a>
      <hr class="divider" />
      <p class="note">
        Please respond as soon as possible so the employer knows to expect you.
        You can confirm or decline from your
        <a href="${dashLink}" style="color:#004b23;">interviews dashboard</a>.
      </p>
    `),
  });
}

// ── Interview response email ───────────────────────────────────────────────
// Sent to the employer when a candidate accepts or declines an interview.
export async function sendInterviewResponseEmail(
  to,
  {
    companyContactName,
    applicantName,
    interviewTitle,
    response,
    candidateNote,
  },
) {
  const firstName = companyContactName.split(" ")[0] || companyContactName;
  const dashLink = `${FRONTEND}/dashboard/employer/interviews`;
  const accepted = response === "accepted";

  const noteSection = candidateNote
    ? `<div class="callout"><strong>Their note:</strong><br />${candidateNote}</div>`
    : "";

  return sendEmail({
    to,
    subject: accepted
      ? `✓ ${applicantName} accepted the interview for "${interviewTitle}"`
      : `${applicantName} declined the interview for "${interviewTitle}"`,
    html: emailHtml(`
      <h1>${accepted ? "Interview accepted ✓" : "Interview declined"}</h1>
      <p>
        Hi ${firstName}, <strong>${applicantName}</strong> has
        <strong>${accepted ? "accepted" : "declined"}</strong> your interview invitation
        for <strong>${interviewTitle}</strong>.
      </p>
      ${noteSection}
      ${
        accepted
          ? `<p>Everything is confirmed. You can view the interview details and prepare accordingly.</p>`
          : `<p>You may want to reschedule or reach out to the candidate directly.</p>`
      }
      <a href="${dashLink}" class="btn">View Interviews</a>
      <hr class="divider" />
      <p class="note">
        Manage all your interviews from your
        <a href="${dashLink}" style="color:#004b23;">employer dashboard</a>.
      </p>
    `),
  });
}

// ── Re-engagement nudges (sent by scripts/sendNudges.js) ───────────────────
// Every nudge carries an unsubscribe link + List-Unsubscribe header so Gmail
// shows its native "Unsubscribe" button instead of users hitting "Spam".
const esc = (v = "") =>
  String(v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

function nudgeFooter(unsubscribeUrl) {
  return `
      <hr class="divider" />
      <p class="note">
        Don't want these reminders?
        <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>.
      </p>`;
}

function unsubHeaders(unsubscribeUrl) {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export async function sendVerifyNudgeEmail(to, fullName, token, unsubscribeUrl) {
  const firstName = esc((fullName || "").split(" ")[0] || "there");
  const link = `${FRONTEND}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: "One step left: verify your TalentHQ account",
    headers: unsubHeaders(unsubscribeUrl),
    html: emailHtml(`
      <h1>Hi ${firstName}, you're almost in</h1>
      <p>
        You created a TalentHQ account but haven't verified your email yet.
        Verified accounts get more attention from employers.
      </p>
      <a href="${link}" class="btn">Verify My Account</a>
      <p class="note">This link expires in <strong>24 hours</strong>. We'll send a fresh one next time if you miss it.</p>
      <p class="link-fallback">Link not working? Copy and paste this into your browser:<br />${link}</p>
      ${nudgeFooter(unsubscribeUrl)}
    `),
  });
}

export async function sendCreateApplicationNudgeEmail(to, fullName, unsubscribeUrl) {
  const firstName = esc((fullName || "").split(" ")[0] || "there");
  const link = `${FRONTEND}/dashboard/jobseeker/applications?new=1`;
  return sendEmail({
    to,
    subject: "Employers can't find you yet. Create your application",
    headers: unsubHeaders(unsubscribeUrl),
    html: emailHtml(`
      <h1>Hi ${firstName}, let employers find you</h1>
      <p>
        Your TalentHQ account is ready, but you haven't created an application yet.
        It takes about 2 minutes: tell us the role you want and where you'd like to work,
        and we'll start matching you with jobs.
      </p>
      <a href="${link}" class="btn">Create My Application</a>
      <p class="link-fallback">Link not working? Copy and paste this into your browser:<br />${link}</p>
      ${nudgeFooter(unsubscribeUrl)}
    `),
  });
}

export async function sendJobMatchNudgeEmail(to, fullName, roleTitle, jobs, unsubscribeUrl) {
  const firstName = esc((fullName || "").split(" ")[0] || "there");
  const browseLink = `${FRONTEND}/findjob`;
  const rows = jobs
    .map(
      (j) => `
      <div class="detail-row">
        <div>
          <a href="${FRONTEND}/findjob/${j._id}" style="color:#004b23;font-weight:700;text-decoration:none;">${esc(j.title)}</a><br />
          <span style="color:#6b7280;font-size:13px;">${esc([j.companyName, j.location, j.type].filter(Boolean).join(" · "))}</span>
        </div>
      </div>`,
    )
    .join("");
  const n = jobs.length;
  return sendEmail({
    to,
    subject: `${n} new job${n > 1 ? "s" : ""} matching "${roleTitle}"`,
    headers: unsubHeaders(unsubscribeUrl),
    html: emailHtml(`
      <h1>Hi ${firstName}, new jobs match your application</h1>
      <p>Based on your application for <strong>${esc(roleTitle)}</strong>, these jobs were posted recently:</p>
      ${rows}
      <br />
      <a href="${browseLink}" class="btn">See All Jobs</a>
      ${nudgeFooter(unsubscribeUrl)}
    `),
  });
}
