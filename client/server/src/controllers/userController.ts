import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { hashPassword } from "./authController.js";

/**
 * GET /api/users
 * List all users (agents). Admin only.
 */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users
 * Create a new agent. Admin only.
 */
export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required", code: "VALIDATION_ERROR" });
      return;
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "A user with this email already exists", code: "DUPLICATE_EMAIL" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "AGENT",
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/users/:id
 * Update a user. Admin only.
 */
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { email, name, role, isActive, password } = req.body;

    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id
 * Soft-delete (deactivate) a user. Admin only.
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.userId) {
      res.status(400).json({ error: "You cannot delete your own account", code: "SELF_DELETE" });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate all sessions for this user
    await prisma.session.deleteMany({ where: { userId: id } });

    res.json({ message: "User deactivated successfully" });
  } catch (error) {
    next(error);
  }
}
