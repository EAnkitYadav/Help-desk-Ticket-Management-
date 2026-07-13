import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

/**
 * GET /api/tickets
 * List tickets with filtering, sorting, and pagination.
 */
export async function listTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      status,
      category,
      priority,
      assignedTo,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query;

    const where: Prisma.TicketWhereInput = {};
    if (status) where.status = status as any;
    if (category) where.category = category as any;
    if (priority) where.priority = priority as any;
    if (assignedTo) {
      if (assignedTo === "unassigned") {
        where.assignedToId = null;
      } else {
        where.assignedToId = assignedTo as string;
      }
    }
    if (search) {
      where.OR = [
        { subject: { contains: search as string, mode: "insensitive" } },
        { senderEmail: { contains: search as string, mode: "insensitive" } },
        { senderName: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets/:id
 * Get a single ticket with all messages.
 */
export async function getTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });
      return;
    }

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tickets
 * Create a new ticket manually.
 */
export async function createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subject, body, description, senderEmail, senderName, category, priority } = req.body;
    const ticketDescription = description || body;

    if (!subject || !ticketDescription || !senderEmail) {
      res.status(400).json({
        error: "Subject, description, and sender email are required",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        description: ticketDescription,
        senderEmail,
        senderName: senderName || "",
        category: category || undefined,
        priority: priority || undefined,
      },
      include: {
        comments: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tickets/:id
 * Update ticket metadata (status, category, priority, assignment).
 */
export async function updateTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, category, priority, assignedToId } = req.body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tickets/:id/messages
 * Add a reply message to a ticket.
 */
export async function addMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!body) {
      res.status(400).json({ error: "Comment body is required", code: "VALIDATION_ERROR" });
      return;
    }

    // Verify ticket exists
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        ticketId: id,
        body,
        authorId: req.userId,
      },
    });

    // Auto-update ticket status if it was closed
    if (ticket.status === "CLOSED") {
      await prisma.ticket.update({
        where: { id },
        data: { status: "OPEN" },
      });
    }

    res.status(201).json({ message: comment });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics.
 */
export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [total, open, resolved, closed, unassigned] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: "OPEN" } }),
      prisma.ticket.count({ where: { status: "RESOLVED" } }),
      prisma.ticket.count({ where: { status: "CLOSED" } }),
      prisma.ticket.count({ where: { assignedToId: null, status: "OPEN" } }),
    ]);

    // Category breakdown
    const byCategory = await prisma.ticket.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    // Priority breakdown
    const byPriority = await prisma.ticket.groupBy({
      by: ["priority"],
      _count: { id: true },
    });

    res.json({
      stats: { total, open, resolved, closed, unassigned },
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
    });
  } catch (error) {
    next(error);
  }
}
