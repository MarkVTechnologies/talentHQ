// middlewares/rateLimiters.js
import { rateLimit } from "express-rate-limit";

// Only for genuine credential-guessing surfaces (login, signup, password
// reset) — never mount this on a whole router. Session-check endpoints like
// GET /api/auth/me and GET /api/superadmin/verify are called on every page
// load by the client's auth-guard hooks; sharing this budget with them means
// a few minutes of normal navigation exhausts it and the guard hooks treat
// the resulting 429 as an invalid session, force-logging the user out.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please wait 15 minutes." },
});
