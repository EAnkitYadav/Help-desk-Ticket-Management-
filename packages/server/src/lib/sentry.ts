import * as Sentry from "@sentry/node";

/**
 * Initialize Sentry for the Express server.
 * Must be called BEFORE any other imports that need to be instrumented.
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn("⚠️  SENTRY_DSN not set — Sentry error tracking is disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

    // Filter out health-check noise
    ignoreErrors: [
      "ECONNRESET",
      "ECONNREFUSED",
      "EPIPE",
    ],

    beforeSend(event) {
      // Scrub sensitive headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });

  console.log("🛡️  Sentry initialized for server");
}

export { Sentry };
