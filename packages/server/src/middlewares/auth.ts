import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import prisma from "../lib/prisma.js";
import { auth } from "../lib/auth.js";

/**
 * Protects routes by verifying a valid session exists.
 * Reads session from Better Auth cookies or Authorization header.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Try Better Auth getSession (reads cookie or authorization header)
    const betterAuthSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    let userId: string | undefined = betterAuthSession?.user?.id;
    let userRole: string | undefined = (betterAuthSession?.user as any)?.role;
    let isActive: boolean | undefined = (betterAuthSession?.user as any)?.isActive;

    // 2. Fallback: Check direct Bearer token or session_token cookie if getSession didn't match
    if (!userId) {
      const authHeader = req.headers.authorization;
      const token =
        authHeader?.startsWith("Bearer ")
          ? authHeader.slice(7)
          : (req.cookies?.session_token as string | undefined) ||
            (req.cookies?.["better-auth.session_token"] as string | undefined);

      if (token) {
        const session = await prisma.session.findUnique({
          where: { id: token },
          include: { user: { select: { id: true, role: true, isActive: true } } },
        });

        if (session && session.expiresAt >= new Date()) {
          userId = session.user.id;
          userRole = session.user.role;
          isActive = session.user.isActive;
        } else if (session) {
          await prisma.session.delete({ where: { id: token } }).catch(() => {});
        }
      }
    }

    if (!userId) {
      res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
      return;
    }

    // Ensure we have current role and isActive from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      res.status(403).json({ error: "Account deactivated", code: "ACCOUNT_DEACTIVATED" });
      return;
    }

    req.userId = dbUser.id;
    req.userRole = dbUser.role;

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
