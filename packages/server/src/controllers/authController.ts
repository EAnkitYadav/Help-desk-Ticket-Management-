import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required", code: "VALIDATION_ERROR" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: { providerId: "credential" },
        },
      },
    });

    const account = user?.accounts[0];

    if (!user || !account || !account.password || !(await verifyPassword({ hash: account.password, password }))) {
      res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account has been deactivated", code: "ACCOUNT_DEACTIVATED" });
      return;
    }

    // Create session (expires in 7 days)
    const token = crypto.randomUUID();
    const session = await prisma.session.create({
      data: {
        id: token,
        token: token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set cookie
    res.cookie("session_token", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      token: session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : (req.cookies?.session_token as string | undefined);

    if (token) {
      await prisma.session.deleteMany({ where: { id: token } });
    }

    res.clearCookie("session_token");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found", code: "NOT_FOUND" });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

// Export password utilities for use in user controller
export { hashPassword };
