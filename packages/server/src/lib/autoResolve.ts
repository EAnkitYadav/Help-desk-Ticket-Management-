import fs from "fs";
import path from "path";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import prisma from "./prisma.js";

const kbPath = path.join(process.cwd(), "knowledge-base.md");
let kbContent = "";
try {
  kbContent = fs.readFileSync(kbPath, "utf-8");
} catch (error) {
  console.error("Failed to read knowledge-base.md:", error);
}

function getFirstName(fullName: string | null, email: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts[0]) {
      return parts[0];
    }
  }
  const namePart = email.split("@")[0] || "";
  const cleanName = namePart.split(/[._\-+]/)[0] || "Customer";
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}

function fallbackResolve(
  subject: string,
  description: string,
  firstName: string
): { shouldResolve: boolean; response?: string; reason: string } {
  const text = `${subject} ${description}`.toLowerCase();

  // Escalation rules check
  if (
    text.includes("legal") ||
    text.includes("sue") ||
    text.includes("lawyer") ||
    text.includes("court") ||
    text.includes("dispute") ||
    text.includes("chargeback") ||
    text.includes("hack") ||
    text.includes("compromise") ||
    text.includes("security")
  ) {
    return {
      shouldResolve: false,
      reason: "Escalated: Legal, billing dispute, or account security concerns detected.",
    };
  }

  // Q: Password reset
  if (
    (text.includes("forgot") && text.includes("password")) ||
    (text.includes("reset") && text.includes("password")) ||
    (text.includes("not receiving") && text.includes("reset"))
  ) {
    return {
      shouldResolve: true,
      reason: "Resolved using KB: Account & Login Issues",
      response: `Dear ${firstName},

Thank you for reaching out. To reset your password, please follow these steps:
1. Go to the login page.
2. Click on the "Forgot Password" link.
3. Enter your registered email address.
4. Follow the instructions sent to your email.

If you do not receive the password reset email, please check your Spam, Junk, or Promotions folder. If it does not arrive within 10 minutes, let us know and we will assist you further.

Best regards,
Email Ankit Support Team`,
    };
  }

  // Q: Course Access
  if (
    (text.includes("purchased") || text.includes("bought")) &&
    (text.includes("cannot see") || text.includes("not showing") || text.includes("missing"))
  ) {
    return {
      shouldResolve: true,
      reason: "Resolved using KB: Course Access & Purchases",
      response: `Dear ${firstName},

Thank you for your purchase. If you cannot see your course, it is likely due to one of the following reasons:
1. You may be logged in with a different email address than the one used for the purchase.
2. The payment might still be processing.
3. The purchase was not completed successfully.

Please check your email receipt to confirm which account the purchase is associated with. If you still have trouble, please reply with your receipt/order details.

Best regards,
Ankit Support Team`,
    };
  }

  // Q: Refund Request
  if (text.includes("refund")) {
    // If they ask for refund but mention something that looks like outside 30 days
    if (
      text.includes("months ago") ||
      text.includes("year ago") ||
      text.includes("days ago") && parseInt(text.match(/(\d+)\s+days?\s+ago/)?.[1] || "0") > 30
    ) {
      return {
        shouldResolve: false,
        reason: "Escalated: Refund request potentially outside the 30-day window.",
      };
    }

    return {
      shouldResolve: true,
      reason: "Resolved using KB: Refund Policy",
      response: `Dear ${firstName},

We offer a 30-day money-back guarantee on all courses. You are eligible for a full refund if requested within 30 days of purchase and you have completed less than 80% of the course.

To proceed with your refund, please reply to this message and provide:
1. Your order receipt.
2. The reason for your refund request.

Refunds are processed within 5 to 10 business days.

Best regards,
Ankit Support Team`,
    };
  }

  // Q: Lifetime access
  if (text.includes("lifetime") && text.includes("access")) {
    return {
      shouldResolve: true,
      reason: "Resolved using KB: Lifetime Access",
      response: `Dear ${firstName},

Lifetime Access for our courses means:
- You pay once.
- You keep access permanently.
- You receive future updates for that course.

Please note that Lifetime Access applies only to the specific course you purchased, not to all courses on the platform.

Best regards,
Ankit Support Team`,
    };
  }

  // Q: Certificates
  if (text.includes("certificate")) {
    return {
      shouldResolve: true,
      reason: "Resolved using KB: Certificates",
      response: `Dear ${firstName},

Yes, we provide certificates of completion! A certificate is automatically issued once you complete 100% of the course lectures.

You can view and download your certificate directly inside your dashboard. Please note that these certificates are not accredited academic degrees.

Best regards,
Ankit Support Team`,
    };
  }

  // Q: Download videos
  if (text.includes("download") && (text.includes("video") || text.includes("lecture"))) {
    return {
      shouldResolve: true,
      reason: "Resolved using KB: Downloading Content",
      response: `Dear ${firstName},

Please note that course videos are streamed online and offline video downloads are not supported. However, any source code, exercises, or resources provided in the course are fully downloadable.

Best regards,
Ankit Support Team`,
    };
  }

  return {
    shouldResolve: false,
    reason: "No matching knowledge base entry found.",
  };
}

export async function autoResolveTicket(ticketId: string): Promise<boolean> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket || ticket.status !== "NEW") {
    return false;
  }

  // Update status to PROCESSING when AI starts processing it
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "PROCESSING" },
  });

  const firstName = getFirstName(ticket.senderName, ticket.senderEmail);

  const hasOpenAIKey =
    process.env.NODE_ENV !== "test" &&
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key" &&
    process.env.OPENAI_API_KEY.trim() !== "";

  let result: { shouldResolve: boolean; response?: string; reason: string };

  if (hasOpenAIKey) {
    try {
      const prompt = `You are an automated support ticket resolver for Code with Mosh.
You have access to the following official Support Knowledge Base:

--- START OF KNOWLEDGE BASE ---
${kbContent}
--- END OF KNOWLEDGE BASE ---

Here is the customer's ticket:
Subject: ${ticket.subject}
Description:
"${ticket.description}"

Analyze the ticket and the Knowledge Base content. You must determine:
1. If the customer's question can be answered using ONLY the information in the Knowledge Base.
2. If any of the following Escalation Rules (from Section 10 of the Knowledge Base) are triggered:
   - The user threatens legal action.
   - The user requests a refund outside the 30-day window.
   - The user disputes a charge or mentions a chargeback.
   - The issue involves account security concerns (e.g. account hacked, compromised credentials, unrecognized logins).
   - Your confidence in this resolution is low.

If the ticket can be resolved using the Knowledge Base AND none of the Escalation Rules apply:
Set "shouldResolve" to true, and write a professional, empathetic, and clear response to the customer in the "response" field. The response must use ONLY the facts, policies, and instructions stated in the Knowledge Base. Do not make up or assume any other details.
IMPORTANT Formatting Rules:
- You MUST address the customer by their first name ("${firstName}") at the very beginning of the response (e.g., "Dear ${firstName}," or "Hi ${firstName},").
- You MUST sign the response at the very end with: "Email Ankit Support Team".

If the ticket CANNOT be resolved by the Knowledge Base (e.g. it's about a specific technical bug not covered, a custom billing issue, etc.) OR any Escalation Rule applies:
Set "shouldResolve" to false, and state the reason in the "reason" field.

Your response MUST be in valid JSON format matching this schema:
{
  "shouldResolve": boolean,
  "response": string (only if shouldResolve is true),
  "reason": string (explanation of why it was resolved or escalated)
}`;

      const response = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
      });
      const parsed = JSON.parse(response.text.trim());
      result = {
        shouldResolve: parsed.shouldResolve,
        response: parsed.response,
        reason: parsed.reason,
      };
    } catch (err) {
      console.error("AI auto-resolve failed, falling back to rule-based engine:", err);
      result = fallbackResolve(ticket.subject, ticket.description, firstName);
    }
  } else {
    result = fallbackResolve(ticket.subject, ticket.description, firstName);
  }

  if (result.shouldResolve && result.response) {
    // 1. Create AI reply comment
    await prisma.comment.create({
      data: {
        ticketId: ticket.id,
        body: result.response,
        isAiGenerated: true,
        isInternal: false,
      },
    });

    // 2. Mark ticket as resolved by AI
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    console.log(`[Auto-Resolve] Ticket ${ticket.id} resolved automatically by AI: ${result.reason}`);
    return true;
  } else {
    // 2. Move ticket to OPEN (stays open) if AI failed to resolve it
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "OPEN",
      },
    });

    console.log(`[Auto-Resolve] Ticket ${ticket.id} NOT resolved by AI, moving to OPEN: ${result.reason}`);
    return false;
  }
}
