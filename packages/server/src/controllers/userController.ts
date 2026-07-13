import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { hashPassword } from "./authController.js";

/**
 * GET /api/users/stats
 * Get user statistics. Admin only.
 */
export async function getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [total, active, admins, agents] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "AGENT" } }),
    ]);

    res.json({
      stats: { total, active, admins, agents },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users
 * List all users (agents/admins) with search, role filter, status filter, sorting, and pagination. Admin only.
 */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      role,
      status,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      limit = "20",
    } = req.query;

    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role as any;
    }

    if (status === "active" || isActive === "true") {
      where.isActive = true;
    } else if (status === "inactive" || isActive === "false") {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total, totalAll, activeCount, adminCount, agentCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { tickets: true } },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "AGENT" } }),
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      stats: {
        total: totalAll,
        active: activeCount,
        admins: adminCount,
        agents: agentCount,
      },
    });
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
