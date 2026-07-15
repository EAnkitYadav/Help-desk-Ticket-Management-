import { PgBoss } from "pg-boss";
import prisma from "./prisma.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const boss = new PgBoss(databaseUrl);

export const QUEUES = {
  CLASSIFY_TICKET: "classify-ticket",
  AUTO_RESOLVE_TICKET: "auto-resolve-ticket",
} as const;

export interface ClassifyTicketJob {
  ticketId: string;
  classifyCategory: boolean;
  classifyPriority: boolean;
}

export async function initQueue() {
  boss.on("error", (error) => {
    console.error("PgBoss error:", error);
  });

  await boss.start();
  console.log("✅ PgBoss queue system started successfully");

  // Ensure queues exist
  await boss.createQueue(QUEUES.CLASSIFY_TICKET);
  await boss.createQueue(QUEUES.AUTO_RESOLVE_TICKET);

  // Import dynamically to avoid circular dependencies
  const { classifyTicketBackground } = await import("../controllers/ticketController.js");

  // Register worker for ticket classification
  await boss.work<ClassifyTicketJob, void>(QUEUES.CLASSIFY_TICKET, async (job) => {
    const jobs = Array.isArray(job) ? job : [job];
    for (const j of jobs) {
      if (!j || !j.data) continue;
      const { ticketId, classifyCategory, classifyPriority } = j.data;
      console.log(`[Queue Worker] Processing ticket classification for ticket: ${ticketId}`);
      await classifyTicketBackground(ticketId, classifyCategory, classifyPriority);
    }
  });

  // Register worker for ticket auto-resolution
  await boss.work<{ ticketId: string }, void>(QUEUES.AUTO_RESOLVE_TICKET, async (job) => {
    const jobs = Array.isArray(job) ? job : [job];
    for (const j of jobs) {
      if (!j || !j.data) continue;
      const { ticketId } = j.data;
      console.log(`[Queue Worker] Processing ticket auto-resolution for ticket: ${ticketId}`);
      const { autoResolveTicket } = await import("./autoResolve.js");
      await autoResolveTicket(ticketId);
    }
  });
}

export async function stopQueue() {
  try {
    await boss.stop();
    console.log("✅ PgBoss queue system stopped");
  } catch (error) {
    console.error("Error stopping PgBoss queue system:", error);
  }
}

export async function enqueueClassification(
  ticketId: string,
  classifyCategory: boolean,
  classifyPriority: boolean
): Promise<string | null> {
  const jobData: ClassifyTicketJob = {
    ticketId,
    classifyCategory,
    classifyPriority,
  };
  // Send the job to the queue
  const jobId = await boss.send(QUEUES.CLASSIFY_TICKET, jobData);
  console.log(`[Queue Publisher] Enqueued classification job for ticket ${ticketId} (Job ID: ${jobId})`);
  return jobId;
}

export async function enqueueAutoResolve(ticketId: string): Promise<string | null> {
  const jobId = await boss.send(QUEUES.AUTO_RESOLVE_TICKET, { ticketId });
  console.log(`[Queue Publisher] Enqueued auto-resolve job for ticket ${ticketId} (Job ID: ${jobId})`);
  return jobId;
}
