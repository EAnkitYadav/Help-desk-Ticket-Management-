import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for the React client.
 * Reads DSN from VITE_SENTRY_DSN environment variable.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn("⚠️  VITE_SENTRY_DSN not set — Sentry error tracking is disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || "0.0.0",
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Don't track noisy errors
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection",
      "Network request failed",
      "Load failed",
      "ChunkLoadError",
    ],
  });

  console.log("🛡️  Sentry initialized for client");
}

export { Sentry };
