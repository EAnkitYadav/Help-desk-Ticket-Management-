import dotenv from "dotenv";
dotenv.config();

// Sentry must be initialized before all other imports
import { initSentry, Sentry } from "./lib/sentry.js";
initSentry();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import prisma from "./lib/prisma.js";
import { auth } from "./lib/auth.js";
import userRoutes from "./routes/users.js";
import ticketRoutes, { dashboardRouter } from "./routes/tickets.js";
import aiRoutes from "./routes/ai.js";
import webhooksRouter from "./routes/webhooks.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { initQueue, stopQueue } from "./lib/queue.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5174",
  process.env.BETTER_AUTH_URL || `http://localhost:${PORT}`,
  `http://localhost:${PORT}`,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// ─── Better Auth Handler (must be before express.json()) ────────────────────────

app.all("/api/auth/*splat", toNodeHandler(auth));

// Mount express.json() AFTER Better Auth handler
app.use(express.json());
app.use(cookieParser());

// ─── Health Check ───────────────────────────────────────────────────────────────

app.get("/api/health", async (_req, res) => {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "error",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── API Routes ─────────────────────────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/ai", aiRoutes);
app.use("/api/webhooks", webhooksRouter);

app.get("/debug-sentry", (req, res) => {
  throw new Error("Sentry debug error: something failed");
});

// ─── Serve Static Assets in Production ──────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(clientDistPath)) {
    console.log(`Serving static files from: ${clientDistPath}`);
    app.use(express.static(clientDistPath));

    app.get("*any", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  } else {
    console.warn(`⚠️ Warning: client/dist not found at ${clientDistPath}. Static serving disabled.`);
  }
}

// ─── Error Handling ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────────

async function main() {
  try {
    // Test database connection on startup
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Start PgBoss queue system
    await initQueue();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth check: http://localhost:${PORT}/api/auth/ok`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    Sentry.captureException(error);
    await Sentry.flush(2000);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await stopQueue();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await stopQueue();
  await prisma.$disconnect();
  process.exit(0);
});

main();
