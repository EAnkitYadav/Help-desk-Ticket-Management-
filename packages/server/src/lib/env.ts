import dotenv from "dotenv";
dotenv.config();

// Ensure BETTER_AUTH_URL has a valid protocol (required by better-auth on startup/evaluation)
if (process.env.BETTER_AUTH_URL) {
  let url = process.env.BETTER_AUTH_URL.trim();
  if (!/^https?:\/\//i.test(url)) {
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1") || url.includes("::1");
    process.env.BETTER_AUTH_URL = `${isLocal ? "http" : "https"}://${url}`;
  }
  console.log(`[env] Sanitized BETTER_AUTH_URL to: ${process.env.BETTER_AUTH_URL}`);
}
