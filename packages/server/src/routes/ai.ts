import { Router } from "express";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { authMiddleware } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

const router: Router = Router();

router.post("/polish", authMiddleware, async (req, res, next) => {
  try {
    const { text, ticketId } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required and must be a string", code: "VALIDATION_ERROR" });
      return;
    }

    let ticketContext = "";
    if (ticketId && typeof ticketId === "string") {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { subject: true, description: true },
      });
      if (ticket) {
        ticketContext = `Ticket Subject: ${ticket.subject}\nTicket Description: ${ticket.description}\n`;
      }
    }

    let bodyText = text.trim();
    const headerRegex = /Dear Customer,[\s\S]*?Regarding your concern:\s*/i;
    const footerRegex = /\s*We hope this information helps\.[\s\S]*?Support Team/i;

    if (headerRegex.test(bodyText) && footerRegex.test(bodyText)) {
      bodyText = bodyText.replace(headerRegex, "").replace(footerRegex, "").trim();
    }

    const prompt = `You are a professional customer support agent.
Improve the following draft reply to make it more professional, empathetic, clear, and helpful.
Maintain the same core message and intent of the draft. Do not add placeholders or fake information.

${ticketContext ? `Context:\n${ticketContext}\n` : ""}
Draft Reply to Polish:
"${bodyText}"

Provide only the polished reply text, without any additional explanations, introductions, or markdown formatting (unless requested in the draft).`;

    let polishedText = "";

    // Check if OPENAI_API_KEY is available and is not placeholder
    const hasOpenAIKey = process.env.NODE_ENV !== "test" &&
                         process.env.OPENAI_API_KEY && 
                         process.env.OPENAI_API_KEY !== "your-openai-api-key" && 
                         process.env.OPENAI_API_KEY.trim() !== "";

    let generatedByAI = false;
    if (hasOpenAIKey) {
      try {
        const response = await generateText({
          model: openai("gpt-4o-mini"),
          prompt,
        });
        polishedText = response.text.trim();
        generatedByAI = true;
      } catch (err) {
        console.error("OpenAI polish failed, falling back to mock logic:", err);
      }
    }

    if (!generatedByAI) {
      // Fallback/Mock polish logic for development
      // Clean up the input text slightly and wrap it in professional templates
      const body = bodyText.replace(/^(hi|hello|hey)\s*,?\s*/i, "").trim();
      
      // Ensure the first character is capitalized
      const capitalizedBody = body.charAt(0).toUpperCase() + body.slice(1);
      
      polishedText = `Dear Customer,

Thank you for reaching out to us. Regarding your concern:

${capitalizedBody}

We hope this information helps. If you need any further assistance or have more questions, please let us know.

Best regards,
Support Team`;
    }

    res.json({ polishedText });
  } catch (error) {
    next(error);
  }
});

router.post("/summarize", authMiddleware, async (req, res, next) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId || typeof ticketId !== "string") {
      res.status(400).json({ error: "Ticket ID is required and must be a string", code: "VALIDATION_ERROR" });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });
      return;
    }

    const conversationText = ticket.comments
      .map((comment, index) => {
        const authorName = comment.isAiGenerated
          ? "AI Assistant"
          : (comment.author?.name || "Agent");
        return `Message #${index + 1} by ${authorName} on ${comment.createdAt.toISOString()}:\n${comment.body}`;
      })
      .join("\n\n");

    const prompt = `You are a professional customer support assistant.
Summarize the following support ticket and its conversation history.
Provide a concise, professional summary highlighting the customer's main issue, key resolutions/proposals, and any pending action items.

Ticket Subject: ${ticket.subject}
Customer: ${ticket.senderName || ticket.senderEmail} (${ticket.senderEmail})
Original Ticket Description (Customer Message):
"${ticket.description}"

Conversation History:
${conversationText || "No replies/comments yet."}

Provide only the summary, without any introductions, headers, conclusions, or markdown formatting.`;

    let summary = "";

    const hasOpenAIKey = process.env.NODE_ENV !== "test" &&
                         process.env.OPENAI_API_KEY &&
                         process.env.OPENAI_API_KEY !== "your-openai-api-key" &&
                         process.env.OPENAI_API_KEY.trim() !== "";

    let generatedByAI = false;
    if (hasOpenAIKey) {
      try {
        const response = await generateText({
          model: openai("gpt-4o-mini"),
          prompt,
        });
        summary = response.text.trim();
        generatedByAI = true;
      } catch (err) {
        console.error("OpenAI summarize failed, falling back to mock logic:", err);
      }
    }

    if (!generatedByAI) {
      const commentCount = ticket.comments.length;
      summary = `The ticket "${ticket.subject}" was opened by ${ticket.senderName || ticket.senderEmail}. The customer's primary concern is: "${ticket.description.slice(0, 100)}${ticket.description.length > 100 ? "..." : ""}". There ${commentCount === 1 ? "is 1 reply" : `are ${commentCount} replies`} in the conversation. Last activity was recorded on ${ticket.updatedAt.toISOString()}.`;
    }

    // Save summary to ticket in database
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { aiSummary: summary },
    });

    res.json({ summary });
  } catch (error) {
    next(error);
  }
});

export default router;

