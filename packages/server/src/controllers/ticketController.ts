import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { Prisma, TicketStatus, TicketCategory, TicketPriority } from "@prisma/client";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { enqueueClassification, enqueueAutoResolve } from "../lib/queue.js";

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
    if (status) {
      where.status = status as TicketStatus;
    } else {
      where.status = { notIn: ["PROCESSING", "NEW"] };
    }
    if (category) where.category = category as TicketCategory;
    if (priority) where.priority = priority as TicketPriority;
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
      where: { id: id as string },
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

export async function classifyTicketBackground(
  ticketId: string,
  classifyCategory: boolean,
  classifyPriority: boolean
): Promise<void> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) return;

    const hasOpenAIKey = process.env.NODE_ENV !== "test" &&
                         process.env.OPENAI_API_KEY &&
                         process.env.OPENAI_API_KEY !== "your-openai-api-key" &&
                         process.env.OPENAI_API_KEY.trim() !== "";

    let category = ticket.category;
    let priority = ticket.priority;
    let didClassify = false;

    if (hasOpenAIKey) {
      try {
        const prompt = `You are a support ticket classification assistant.
Given the following ticket subject and description, classify the ticket.

Ticket Subject: ${ticket.subject}
Description:
"${ticket.description}"

Available Categories: GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST
Available Priorities: LOW, MEDIUM, HIGH, URGENT

Respond in valid JSON format only, matching this structure:
{
  "category": "GENERAL_QUESTION" | "TECHNICAL_QUESTION" | "REFUND_REQUEST",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT"
}`;

        const response = await generateText({
          model: openai("gpt-4o-mini"),
          prompt,
        });

        const result = JSON.parse(response.text.trim());
        if (classifyCategory && result.category) category = result.category;
        if (classifyPriority && result.priority) priority = result.priority;
        didClassify = true;
      } catch (err) {
        console.error("AI classification failed, falling back to keyword rules:", err);
      }
    }

    if (!didClassify) {
      // Fallback/Mock classification logic based on keywords
      const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
      if (classifyCategory) {
        if (text.includes("refund") || text.includes("billing") || text.includes("charge") || text.includes("money back")) {
          category = "REFUND_REQUEST";
        } else if (text.includes("error") || text.includes("bug") || text.includes("crash") || text.includes("failed") || text.includes("technical") || text.includes("setup")) {
          category = "TECHNICAL_QUESTION";
        } else {
          category = "GENERAL_QUESTION";
        }
      }
      if (classifyPriority) {
        if (text.includes("urgent") || text.includes("crash") || text.includes("asap") || text.includes("emergency")) {
          priority = "URGENT";
        } else if (text.includes("important") || text.includes("high") || text.includes("refund")) {
          priority = "HIGH";
        } else if (text.includes("low") || text.includes("minor")) {
          priority = "LOW";
        } else {
          priority = "MEDIUM";
        }
      }
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        category,
        priority,
      },
    });
    console.log(`[AI Classification] Ticket ${ticketId} auto-classified: Category=${category}, Priority=${priority}`);
  } catch (error) {
    console.error("Error in automatic ticket classification:", error);
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

    // Run classification using pg-boss queue
    const classifyCategory = !category;
    const classifyPriority = !priority;
    if (classifyCategory || classifyPriority) {
      enqueueClassification(ticket.id, classifyCategory, classifyPriority).catch((err) => {
        console.error("Error enqueuing ticket classification:", err);
      });
    }

    // Run auto-resolution using pg-boss queue
    enqueueAutoResolve(ticket.id).catch((err) => {
      console.error("Error enqueuing ticket auto-resolution:", err);
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

    const updateData: Prisma.TicketUncheckedUpdateInput = {};
    if (status !== undefined) updateData.status = status as TicketStatus;
    if (category !== undefined) updateData.category = category as TicketCategory;
    if (priority !== undefined) updateData.priority = priority as TicketPriority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    const ticket = await prisma.ticket.update({
      where: { id: id as string },
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
    const ticket = await prisma.ticket.findUnique({ where: { id: id as string } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        ticketId: id as string,
        body,
        authorId: req.userId,
      },
    });

    // Auto-update ticket status if it was closed
    if (ticket.status === "CLOSED") {
      await prisma.ticket.update({
        where: { id: id as string },
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
