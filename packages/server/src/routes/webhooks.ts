import { Router } from "express";
import multer from "multer";
import Parse from "@sendgrid/inbound-mail-parser";
import { z } from "zod";
import { requireWebhookSecret } from "../middlewares/requireWebhookSecret.js";
import prisma from "../lib/prisma.js";
import { enqueueClassification, enqueueAutoResolve } from "../lib/queue.js";

const upload = multer();

function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim();
}

function parseFromField(from: string): { email: string; name: string } {
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1]!.trim() || match[2]!, email: match[2]! };
  }
  return { name: from, email: from };
}

const inboundEmailSchema = z.object({
  from: z.string().email("Invalid email address"),
  fromName: z.string().trim().min(1, "Sender name is required"),
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  bodyHtml: z.string().optional(),
});

const router: Router = Router();

router.post("/inbound-email", requireWebhookSecret, upload.any(), async (req, res) => {
  try {
    const parser = new Parse(
      { keys: ["to", "from", "subject", "text", "html"] },
      { body: req.body, files: (req.files as Express.Multer.File[]) || [] }
    );
    const parsed = parser.keyValues();
    const { email, name } = parseFromField(parsed.from || "");

    const result = inboundEmailSchema.safeParse({
      from: email,
      fromName: name,
      subject: parsed.subject || "",
      body: parsed.text || "",
      bodyHtml: parsed.html || undefined,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Validation failed" });
      return;
    }

    const data = result.data;
    const normalizedSubject = stripSubjectPrefixes(data.subject);

    // Check for existing open ticket from same sender with matching subject
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        senderEmail: data.from,
        status: { notIn: ["RESOLVED", "CLOSED"] },
        subject: { equals: normalizedSubject, mode: "insensitive" },
      },
    });

    if (existingTicket) {
      await prisma.comment.create({
        data: {
          body: data.body,
          isInternal: false,
          isAiGenerated: false,
          ticketId: existingTicket.id,
          authorId: null,
        },
      });
      res.status(200).json({ ticket: existingTicket });
      return;
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject: normalizedSubject,
        description: data.body,
        senderName: data.fromName,
        senderEmail: data.from,
      },
    });

    // Run classification using pg-boss queue
    enqueueClassification(ticket.id, true, true).catch((err) => {
      console.error("Error enqueuing ticket classification:", err);
    });

    // Run auto-resolution using pg-boss queue
    enqueueAutoResolve(ticket.id).catch((err) => {
      console.error("Error enqueuing ticket auto-resolution:", err);
    });

    res.status(201).json({ ticket });
  } catch (error) {
    console.error("Error handling inbound email webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
