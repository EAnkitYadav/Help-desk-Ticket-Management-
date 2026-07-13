import dotenv from "dotenv";
import path from "path";

// Load .env from the monorepo root
dotenv.config({ path: path.resolve(import.meta.dir, "../../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  sessionSecret: process.env.SESSION_SECRET || "change-me-in-production",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "support@example.com",
  },
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  },
} as const;
