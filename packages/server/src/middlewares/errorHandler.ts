import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";

// Extend Express Request to include user session data
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiError>,
  _next: NextFunction
): void {
  console.error("Unhandled error:", err);

  const statusCode = (err as any).statusCode || 500;

  // Report server errors to Sentry
  if (statusCode >= 500) {
    Sentry.captureException(err);
  }

  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
    code: (err as any).code || "INTERNAL_ERROR",
  });
}

export function notFoundHandler(_req: Request, res: Response<ApiError>): void {
  res.status(404).json({
    error: "The requested resource was not found",
    code: "NOT_FOUND",
  });
}
