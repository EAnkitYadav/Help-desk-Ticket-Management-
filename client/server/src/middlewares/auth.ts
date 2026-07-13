import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

/**
 * Protects routes by verifying a valid session exists.
 * Reads the session token from the `Authorization` header (Bearer token)
 * or from a cookie named `session_token`.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from header or cookie
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : (req.cookies?.session_token as string | undefined);

    if (!token) {
      res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
      return;
    }

    // Look up the session
    const session = await prisma.session.findUnique({
      where: { id: token },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await prisma.session.delete({ where: { id: token } });
      }
      res.status(401).json({ error: "Session expired", code: "SESSION_EXPIRED" });
      return;
    }

    if (!session.user.isActive) {
      res.status(403).json({ error: "Account deactivated", code: "ACCOUNT_DEACTIVATED" });
      return;
    }

    // Attach user info to request
    req.userId = session.user.id;
    req.userRole = session.user.role;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Restricts access to admin-only routes.
 * Must be used after authMiddleware.
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.userRole !== "ADMIN") {
    res.status(403).json({ error: "Admin access required", code: "FORBIDDEN" });
    return;
  }
  next();
}
