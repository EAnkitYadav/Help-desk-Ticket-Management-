import prisma from "../lib/prisma.js";

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await Bun.password.hash("admin123", { algorithm: "bcrypt", cost: 10 });

  const admin = await prisma.user.upsert({
    where: { email: "admin@helpdesk.com" },
    update: {},
    create: {
      email: "admin@helpdesk.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  console.log(`  ✅ Admin user created: ${admin.email}`);

  // Create a sample agent
  const agentPassword = await Bun.password.hash("agent123", { algorithm: "bcrypt", cost: 10 });

  const agent = await prisma.user.upsert({
    where: { email: "agent@helpdesk.com" },
    update: {},
    create: {
      email: "agent@helpdesk.com",
      password: agentPassword,
      name: "Support Agent",
      role: "AGENT",
    },
  });

  console.log(`  ✅ Agent user created: ${agent.email}`);

  // Create sample tickets
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        subject: "Cannot access my account",
        body: "Hi, I've been trying to log in but keep getting an error. My email is john@example.com. Can you help?",
        senderEmail: "john@example.com",
        senderName: "John Doe",
        status: "OPEN",
        category: "TECHNICAL_QUESTION",
        priority: "HIGH",
        assignedToId: agent.id,
        messages: {
          create: {
            body: "Hi, I've been trying to log in but keep getting an error. My email is john@example.com. Can you help?",
            sender: "CUSTOMER",
            senderEmail: "john@example.com",
          },
        },
      },
    }),
    prisma.ticket.create({
      data: {
        subject: "Request for refund on course",
        body: "Hello, I purchased the Advanced Python course but it doesn't cover what I expected. I'd like a refund please.",
        senderEmail: "jane@example.com",
        senderName: "Jane Smith",
        status: "OPEN",
        category: "REFUND_REQUEST",
        priority: "MEDIUM",
        messages: {
          create: {
            body: "Hello, I purchased the Advanced Python course but it doesn't cover what I expected. I'd like a refund please.",
            sender: "CUSTOMER",
            senderEmail: "jane@example.com",
          },
        },
      },
    }),
    prisma.ticket.create({
      data: {
        subject: "How do I reset my password?",
        body: "Hi there, can you tell me how to reset my password? I can't find the option anywhere.",
        senderEmail: "bob@example.com",
        senderName: "Bob Wilson",
        status: "RESOLVED",
        category: "GENERAL_QUESTION",
        priority: "LOW",
        assignedToId: agent.id,
        messages: {
          create: [
            {
              body: "Hi there, can you tell me how to reset my password? I can't find the option anywhere.",
              sender: "CUSTOMER",
              senderEmail: "bob@example.com",
            },
            {
              body: "Hi Bob! You can reset your password by clicking on 'Forgot Password' on the login page. You'll receive a reset link via email.",
              sender: "AGENT",
              senderEmail: agent.email,
            },
          ],
        },
      },
    }),
  ]);

  console.log(`  ✅ ${tickets.length} sample tickets created`);

  // Create knowledge base articles
  const articles = await Promise.all([
    prisma.knowledgeBase.create({
      data: {
        title: "How to Reset Your Password",
        content: "To reset your password, go to the login page and click 'Forgot Password'. Enter your email address and follow the link sent to your inbox. The reset link expires in 24 hours.",
        category: "Account",
      },
    }),
    prisma.knowledgeBase.create({
      data: {
        title: "Refund Policy",
        content: "We offer full refunds within 30 days of purchase. To request a refund, please contact support with your order number. Refunds are processed within 5-7 business days.",
        category: "Billing",
      },
    }),
  ]);

  console.log(`  ✅ ${articles.length} knowledge base articles created`);
  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
