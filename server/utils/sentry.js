// utils/sentry.js
// Optional error tracking. Fully inert unless SENTRY_DSN is set, and loaded
// via dynamic import wrapped in try/catch so the server still boots even if
// @sentry/node isn't installed yet (e.g. before "Run NPM Install" on the host).
let Sentry = null;
let enabled = false;

export async function initSentry() {
  if (!process.env.SENTRY_DSN) return; // not configured — stay silent
  try {
    Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      // Performance tracing is off by default (0); set SENTRY_TRACES_SAMPLE_RATE
      // (e.g. 0.1) to sample transactions once you want it.
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      sendDefaultPii: false,
    });
    enabled = true;
    process.on("unhandledRejection", (reason) => captureException(reason));
    process.on("uncaughtException", (err) => captureException(err));
    console.log("✅ Sentry error tracking enabled");
  } catch (err) {
    console.warn(
      "⚠️  Sentry not initialized (install @sentry/node to enable):",
      err.message,
    );
  }
}

export function captureException(err) {
  try {
    if (enabled && Sentry) Sentry.captureException(err);
  } catch {
    /* never let error reporting throw */
  }
}
