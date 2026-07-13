import { PrismaClient, Role, TicketStatus, TicketCategory, TicketPriority } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
});

async function upsertUser({
  email,
  password,
  name,
  role,
}: {
  email: string;
  password: string;
  name: string;
  role: Role;
}) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });
    if (!res || !res.user) {
      throw new Error(`Failed to create user: ${email}`);
    }
    user = await prisma.user.update({
      where: { id: res.user.id },
      data: { role, name },
    });
    // Clean up temporary session created by signUpEmail during seeding
    await prisma.session.deleteMany({ where: { userId: user.id } });
  } else {
    user = await prisma.user.update({
      where: { email },
      data: { role, name },
    });
  }
  return user;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "password@123";

  const agent1Email = process.env.AGENT1_EMAIL || "agent1@example.com";
  const agent2Email = process.env.AGENT2_EMAIL || "agent2@example.com";
  const agentPassword = process.env.AGENT_PASSWORD || adminPassword;

  // ─── Create Admin User ──────────────────────────────────────────────────────

  const admin = await upsertUser({
    email: adminEmail,
    password: adminPassword,
    name: "Admin User",
    role: Role.ADMIN,
  });
  console.log(`  ✅ Admin user created/verified: ${admin.email} (Role: ${admin.role})`);

  // ─── Create Agent Users ─────────────────────────────────────────────────────

  const agent1 = await upsertUser({
    email: agent1Email,
    password: agentPassword,
    name: "Sarah Johnson",
    role: Role.AGENT,
  });
  console.log(`  ✅ Agent created/verified: ${agent1.email} (Role: ${agent1.role})`);

  const agent2 = await upsertUser({
    email: agent2Email,
    password: agentPassword,
    name: "Mike Chen",
    role: Role.AGENT,
  });
  console.log(`  ✅ Agent created/verified: ${agent2.email} (Role: ${agent2.role})`);

  // ─── Create Sample Tickets ──────────────────────────────────────────────────

  const existingTicketsCount = await prisma.ticket.count();
  if (existingTicketsCount === 0) {
    const tickets = await Promise.all([
      prisma.ticket.create({
        data: {
          subject: "Cannot access my course materials",
          description:
            "I purchased the Advanced JavaScript course last week but I still cannot access the materials. My account shows the purchase but the course page says 'Not enrolled'.",
          status: TicketStatus.OPEN,
          category: TicketCategory.TECHNICAL_QUESTION,
          priority: TicketPriority.HIGH,
          senderName: "John Doe",
          senderEmail: "john.doe@example.com",
          assignedToId: agent1.id,
        },
      }),
      prisma.ticket.create({
        data: {
          subject: "Request for refund - Wrong course purchased",
          description:
            "I accidentally purchased the Python Basics course instead of the Python Advanced course. I would like a refund so I can purchase the correct one.",
          status: TicketStatus.OPEN,
          category: TicketCategory.REFUND_REQUEST,
          priority: TicketPriority.MEDIUM,
          senderName: "Jane Smith",
          senderEmail: "jane.smith@example.com",
          assignedToId: agent2.id,
        },
      }),
      prisma.ticket.create({
        data: {
          subject: "How do I get a certificate?",
          description:
            "I have completed the React Fundamentals course. How do I download or access my certificate of completion?",
          status: TicketStatus.RESOLVED,
          category: TicketCategory.GENERAL_QUESTION,
          priority: TicketPriority.LOW,
          senderName: "Alice Brown",
          senderEmail: "alice.brown@example.com",
          assignedToId: agent1.id,
          resolvedAt: new Date(),
        },
      }),
      prisma.ticket.create({
        data: {
          subject: "Video player not loading on mobile",
          description:
            "The video player does not load on my iPhone when I try to watch course videos. I am using Safari on iOS 17. The page just shows a blank white area where the video should be.",
          status: TicketStatus.OPEN,
          category: TicketCategory.TECHNICAL_QUESTION,
          priority: TicketPriority.URGENT,
          senderName: "Bob Wilson",
          senderEmail: "bob.wilson@example.com",
        },
      }),
    ]);
    console.log(`  ✅ Created ${tickets.length} sample tickets`);

    // ─── Create Sample Comments ─────────────────────────────────────────────────

    await prisma.comment.create({
      data: {
        body: "Hi John, I can see the issue on your account. Let me escalate this to our technical team. In the meantime, could you try logging out and back in?",
        ticketId: tickets[0].id,
        authorId: agent1.id,
      },
    });

    await prisma.comment.create({
      data: {
        body: "Based on the ticket details, this appears to be an enrollment sync issue. The student's payment was processed but the enrollment record was not created in the LMS.",
        ticketId: tickets[0].id,
        authorId: agent1.id,
        isInternal: true,
        isAiGenerated: true,
      },
    });
    console.log("  ✅ Created sample comments");
  } else {
    console.log(`  ℹ️ Tickets already exist (${existingTicketsCount}), skipping sample tickets creation`);
  }

  // ─── Create Knowledge Articles ──────────────────────────────────────────────

  const existingArticlesCount = await prisma.knowledgeArticle.count();
  if (existingArticlesCount === 0) {
    await Promise.all([
      prisma.knowledgeArticle.create({
        data: {
          title: "How to Access Course Materials",
          content:
            "After purchasing a course, you can access your materials by navigating to 'My Courses' in the top navigation bar. Click on the course you wish to access. If you see 'Not Enrolled' despite having purchased the course, please try logging out and back in. If the issue persists, contact support.",
          category: TicketCategory.GENERAL_QUESTION,
        },
      }),
      prisma.knowledgeArticle.create({
        data: {
          title: "Refund Policy",
          content:
            "We offer a 30-day money-back guarantee on all courses. To request a refund, please contact our support team with your order number and reason for the refund. Refunds are typically processed within 5-7 business days.",
          category: TicketCategory.REFUND_REQUEST,
        },
      }),
      prisma.knowledgeArticle.create({
        data: {
          title: "Troubleshooting Video Playback Issues",
          content:
            "If you are experiencing issues with video playback: 1) Clear your browser cache. 2) Try a different browser (Chrome, Firefox, or Edge recommended). 3) Disable browser extensions. 4) Check your internet connection. 5) If on mobile, ensure you have the latest OS version. If none of these steps resolve the issue, please contact support with your device and browser details.",
          category: TicketCategory.TECHNICAL_QUESTION,
        },
      }),
    ]);
    console.log("  ✅ Created knowledge articles");
  } else {
    console.log(`  ℹ️ Knowledge articles already exist (${existingArticlesCount}), skipping articles creation`);
  }

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
