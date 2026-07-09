// Env vars are loaded via "-r dotenv/config" in the npm scripts.
// This runs BEFORE any ESM imports resolve, so process.env is fully
// populated by the time passport.js, env-check.js, etc. are imported.
import { checkEnv } from "./utils/env-check.js";
checkEnv();

import http from "http";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fs from "fs";
import path from "path";
import cookieParser from "cookie-parser";
import session from "express-session";
import { rateLimit } from "express-rate-limit";
import passportMiddleware from "./middlewares/passport.js";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";

// Routes
import authRoutes from "./routes/auth.js";
import oauthRoutes from "./routes/oauthRoutes.js";
import employerRoutes from "./routes/employerRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import onboardingRoutes from "./routes/OnboardingRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import jobseekerApplicationRoutes from "./routes/JobseekerApplicationsRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import handymanRoutes from "./routes/Handymanroutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import flagRoutes from "./routes/Flagroutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import jobseekerRoutes from "./routes/jobseekerRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";

const app = express();

// ── HTTP server (shared by Express + Socket.io) ───────────────────────────────
const httpServer = http.createServer(app);

app.set("trust proxy", 1);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 5 * 60 * 1000,
    },
  }),
);
app.use(passportMiddleware.initialize());
app.use(passportMiddleware.session());

// Ensure upload folders exist

const resumePath = "./uploads/resumes";
if (!fs.existsSync(resumePath)) fs.mkdirSync(resumePath, { recursive: true });

const avatarPath = "./uploads/avatars";
if (!fs.existsSync(avatarPath)) fs.mkdirSync(avatarPath, { recursive: true });

// ── CORS ──────────────────────────────────────────────────────────────────────
const normalizeOrigin = (o) => (o ? o.replace(/\/$/, "") : o);

const PRODUCTION_ORIGINS = [
  process.env.FRONTEND_URL,
  "https://talenthq.buzz",
  "https://www.talenthq.buzz",
  "https://talenthq.netlify.app",
]
  .filter(Boolean)
  .map(normalizeOrigin);

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? PRODUCTION_ORIGINS
    : ["http://localhost:3000", "http://localhost:5000"];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(normalizeOrigin(origin)))
        return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

// ── Socket.io ─────────────────────────────────────────────────────────────────
// Attached to the shared HTTP server with matching CORS + credentials.
// Auth: the JWT httpOnly cookie is sent with the handshake; we verify it so only
// logged-in users can open a socket. Each user joins a personal room (their id)
// and can join conversation rooms (convo_<id>) to receive live message events.
const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.use((socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    const token = tokenMatch?.[1];
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  // Personal room — lets us push directly to a specific user
  socket.join(socket.userId.toString());

  socket.on("join_conversation", (conversationId) => {
    if (conversationId) socket.join(`convo_${conversationId}`);
  });

  socket.on("leave_conversation", (conversationId) => {
    if (conversationId) socket.leave(`convo_${conversationId}`);
  });
});

// Export io so controllers can emit events (lazy-imported there to avoid cycles)
export { io };

// ── Rate limiters ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please wait a few minutes." },
});
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages. Please wait before sending again." },
});

app.use(globalLimiter);

if (process.env.NODE_ENV !== "production") {
  const __dirname = path.resolve();
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/contact", contactLimiter, contactRoutes);
app.use("/api/superadmin", adminRoutes);
app.use("/api/employers", employerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/profile", jobseekerApplicationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/handymen", handymanRoutes);
app.use("/api/jobseekers", jobseekerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/flags", flagRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/stats", statsRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .json({ message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message);
  if (err.message?.startsWith("CORS:"))
    return res.status(403).json({ message: err.message });
  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "An internal server error occurred."
        : err.message,
  });
});

// ── MongoDB + startup ─────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");
    try {
      const db = mongoose.connection.db;
      await db
        .collection("jobnodes")
        .createIndex({ email: 1 }, { unique: true, background: true });
      await db
        .collection("jobnodes")
        .createIndex(
          { oauthProvider: 1, oauthId: 1 },
          { sparse: true, background: true },
        );
      await db
        .collection("handymen")
        .createIndex({ email: 1 }, { unique: true, background: true });
      await db
        .collection("handymen")
        .createIndex(
          { oauthProvider: 1, oauthId: 1 },
          { sparse: true, background: true },
        );
      await db
        .collection("employers")
        .createIndex({ email: 1 }, { unique: true, background: true });
      await db
        .collection("employers")
        .createIndex(
          { oauthProvider: 1, oauthId: 1 },
          { sparse: true, background: true },
        );
      await db
        .collection("jobs")
        .createIndex({ category: 1 }, { background: true });
      await db
        .collection("jobs")
        .createIndex({ createdAt: -1 }, { background: true });
      await db
        .collection("applications")
        .createIndex({ jobseeker: 1 }, { background: true });
      await db
        .collection("emailtokens")
        .createIndex({ token: 1 }, { background: true });
      await db
        .collection("emailtokens")
        .createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0, background: true },
        );
      await db
        .collection("sessions")
        .createIndex({ tokenHash: 1 }, { background: true });
      await db
        .collection("sessions")
        .createIndex({ userId: 1 }, { background: true });
      await db
        .collection("sessions")
        .createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0, background: true },
        );
      console.log("✅ Database indexes ensured");
    } catch (e) {
      console.warn("⚠️  Index warning (non-fatal):", e.message);
    }
    const PORT = process.env.PORT || 5000;
    // IMPORTANT: listen on httpServer (not app) so Socket.io shares the port
    httpServer.listen(PORT, () =>
      console.log(
        `🚀 Server on port ${PORT} [${process.env.NODE_ENV || "development"}] — Socket.io enabled`,
      ),
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
