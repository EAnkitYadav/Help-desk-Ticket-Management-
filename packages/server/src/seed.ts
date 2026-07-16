import "./lib/env.js";
import { PrismaClient, Role, TicketStatus, TicketCategory, TicketPriority } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

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

  const isProduction = process.env.NODE_ENV === "production";
  const existingTicketsCount = await prisma.ticket.count();

  if (isProduction && existingTicketsCount > 0) {
    console.log(`  ℹ️ Tickets already exist (${existingTicketsCount}), skipping sample tickets/comments creation.`);
  } else {
    if (!isProduction) {
      console.log("  Cleaning up existing tickets and comments for fresh development seed...");
      await prisma.comment.deleteMany({});
      await prisma.ticket.deleteMany({});
    }

  const FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
  const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

  const SUBJECTS_TECHNICAL = [
    "Docker container exiting with code 137",
    "React build failing on Vercel deployment",
    "SSL Certificate expired error on dashboard",
    "Database connection pool exhaustion",
    "API returning 504 Gateway Timeout",
    "Webhook signatures failing validation",
    "Mobile app crashing on launch (iOS 17)",
    "Cannot reset MFA / 2FA code lost",
    "Memory leak in background workers",
    "Prisma migration lock not releasing",
    "NextJS image optimization 400 Bad Request",
    "Invalid API Key headers rejected",
    "WebSocket connection closed unexpectedly",
    "Redis connection timeout error",
    "CSS styles not loading on production build",
    "File upload failing for sizes > 10MB",
    "Cognito login redirect loop",
    "Slow query performance on reports page",
    "CORS headers missing on healthcheck endpoint",
    "PDF export generating blank pages"
  ];

  const DESCRIPTIONS_TECHNICAL = [
    "When I run the production build in my Docker environment, it gets killed after 10 seconds. Output says exited with code 137. It looks like it is hitting the memory limit.",
    "Every time I push to main, the deployment on Vercel fails during the build step with error 'Cannot find module'. Locally it runs perfectly.",
    "I am seeing a security warning when visiting our client portal. Browser says the SSL certificate has expired today.",
    "Under heavy load, our express app stops responding to DB queries. The error logs show 'PrismaClientKnownRequestError: Connection pool limit reached'.",
    "The /api/analytics endpoint has started throwing 504 gateway timeout errors when querying data for the last 6 months.",
    "I am verifying webhooks using the secret provided in settings, but my validation code keeps failing with signature mismatch.",
    "After upgrading my test device to iOS 17.4, the app crashes immediately upon opening. Here is the stack trace from TestFlight...",
    "I got a new phone and lost my authenticator app backup. Can you temporarily disable MFA on my developer account so I can re-register?",
    "The node process memory usage increases linearly over 24 hours until it crashes. It seems related to the PDF generation worker queue.",
    "Prisma migrate deploy gets stuck on 'Applying migration' and then times out saying it cannot acquire migration lock.",
    "Vite image component returns 400 when loading remote images from S3. The logs say host is not allowed, but I configured it in next.config.js.",
    "I am passing the X-API-Key header to the endpoints but receiving a 401 Unauthorized. Can you verify if my key was revoked?",
    "The real-time chat disconnects every 30 seconds. The browser console shows close code 1006. Is there a load balancer timeout?",
    "Getting 'ECONNREFUSED' when trying to connect to the Redis cluster from the serverless functions.",
    "After deploying the latest release, the page looks completely unstyled. Inspecting the DOM shows the stylesheet href returns a 404.",
    "Uploading images works fine, but when uploading larger videos we get a 413 Payload Too Large error.",
    "When logging in via AWS Cognito, the user is redirected back to the login screen instead of the dashboard, creating an infinite loop.",
    "The admin dashboard takes over 15 seconds to load. The database logs highlight a sequential scan on the Transactions table.",
    "Our frontend calls the health check endpoint, but Chrome blocks it due to missing Access-Control-Allow-Origin headers.",
    "The generate-invoice PDF feature works for small invoices, but for orders with more than 50 items it results in a blank page."
  ];

  const SUBJECTS_GENERAL = [
    "How to change my primary email address",
    "Requesting copy of invoice #INV-8832",
    "Where to find the API documentation",
    "Inquiry about team subscription plans",
    "How to export my data to CSV",
    "Change account owner permissions",
    "Downgrading from Premium to Starter",
    "Do you support single sign-on (SSO)?",
    "Can I pause my subscription?",
    "Looking for the certificate of completion",
    "How to set up custom domain",
    "Where to update billing details",
    "How to delete my account permanently",
    "Is there a student discount available?",
    "Inquiry about HIPAA compliance status",
    "How to add a new team member",
    "Reset password link not received",
    "Do you have a public roadmap?",
    "How long is the free trial period?",
    "Request to update company name on invoice"
  ];

  const DESCRIPTIONS_GENERAL = [
    "I want to change the primary email address associated with my account to my corporate email address. I don't see an option to do this in the profile settings.",
    "I need a PDF copy of my subscription invoice #INV-8832 for tax filing purposes. Could you please email it to me?",
    "I am looking for the developer API documentation. The link in the footer returns a 404. Can you direct me to the correct URL?",
    "We are expanding our team and need to know the pricing tiers for 20+ users. Do you offer volume discounts?",
    "I want to download all my ticket history and customer records. Is there a CSV export button available in the admin panel?",
    "Our current account owner is leaving the company. How do we transfer full owner permissions to another admin account?",
    "I would like to downgrade my account from the Enterprise plan to the Starter plan starting next month.",
    "We want to enforce Okta SSO for all our staff. Can you tell us if this feature is supported on the Growth plan?",
    "We are pausing our projects for the summer. Can we put our active subscription on hold without losing our saved configurations?",
    "I completed the training module yesterday but haven't received the certificate PDF. Where can I download it?",
    "I want to point my custom subdomain support.mycompany.com to the helpdesk portal. What CNAME records do I need to configure?",
    "Our credit card is expiring soon. Where in the settings dashboard can I update the payment card details?",
    "I no longer need this service and would like to have all my personal data and account records permanently deleted.",
    "I am a university student and would love to use this for my senior project. Do you offer any student discounts or credits?",
    "Our legal department requires a signed BAA before we can upload customer data. Is your service HIPAA compliant?",
    "I want to invite three new developers to our workspace. Are there extra costs per seat, or is it flat-rate pricing?",
    "I clicked the 'Forgot Password' button multiple times but I am not receiving any recovery email in my inbox or spam folder.",
    "We love the product and want to see what features are planned for Q3 and Q4. Do you publish a public product roadmap?",
    "I signed up for a trial account. Could you confirm how many days are remaining and what features will be locked after the trial ends?",
    "The invoice generated yesterday shows our old company address. Can you update the address and re-issue the invoice?"
  ];

  const SUBJECTS_REFUND = [
    "Accidental duplicate subscription charge",
    "Refund request for unused annual plan",
    "Charged after canceling the trial",
    "Refund request: Wrong billing cycle selected",
    "Requested refund for unsatisfactory service",
    "Billing error: charged twice in same month",
    "Refund for student discount not applied",
    "Overcharged on seat count update",
    "Refund request for expired coupon code",
    "Refund inquiry: service downtime compensation",
    "Accidental upgrade to Enterprise tier",
    "Refund request for failed transaction",
    "VAT charge refund for tax-exempt entity",
    "Charged for inactive users on team plan",
    "Refund request: platform did not meet needs",
    "Request to cancel purchase and get refund",
    "Wrong currency billed during checkout",
    "Double payment processed on invoice",
    "Refund requested for training session cancellation",
    "Unexpected auto-renewal charge refund"
  ];

  const DESCRIPTIONS_REFUND = [
    "My bank statement shows two identical charges of $49.00 from your company on the same day. Please refund the duplicate transaction.",
    "I purchased the annual plan yesterday but our project budget was cut. I would like to request a full refund and switch to monthly.",
    "I canceled my trial subscription three days ago, but I was still charged $29.00 this morning. Please process a refund.",
    "I intended to subscribe to the monthly plan, but the system checked out the annual plan instead. Please refund the difference.",
    "The product lacks several key features we need. I would like to cancel our account and request a refund under your 30-day policy.",
    "We changed our billing cycle from monthly to annual, but we were billed for both plans this month. Please refund the monthly portion.",
    "I entered my student promo code during checkout, but the final invoice charged the full price. Can you refund the discount amount?",
    "We removed 5 seats from our team plan last week, but our monthly invoice still charged for the old seat count. Please refund.",
    "I forgot to apply the WELCOME20 coupon code. Can you refund 20% of my purchase or apply it retroactively?",
    "Our service was down for over 48 hours last week, impacting our business. We would like to request a refund for this month's billing.",
    "I clicked the upgrade button by mistake and my card was charged $299. Please downgrade my account back to Pro and refund.",
    "The checkout page showed a failed transaction error, so I tried again. Now I see two charges on my card. Please refund one.",
    "Our organization is tax-exempt. We provided our tax ID during checkout, but VAT was still charged. Please refund the VAT amount.",
    "We were billed for 15 users, but 4 of them are deactivated/inactive. Please refund the charges for those inactive seats.",
    "We evaluated the software for a week but it doesn't fit our workflow. Please issue a refund as per the money-back guarantee.",
    "My child made a purchase on my account without my permission. I would like to cancel the purchase and request a full refund.",
    "I selected USD as my currency, but the checkout billed me in EUR, resulting in foreign exchange fees. Please adjust and refund.",
    "I paid my invoice via bank transfer, but my credit card was also automatically charged. Please refund the credit card charge.",
    "We need to cancel the scheduled training session next week. Please refund the booking fee as per the cancellation policy.",
    "I did not receive any notification that my subscription was about to renew. Please cancel the renewal and refund the charge."
  ];

  const ticketDataList = [
    {
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
    {
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
    {
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
    {
      subject: "Video player not loading on mobile",
      description:
        "The video player does not load on my iPhone when I try to watch course videos. I am using Safari on iOS 17. The page just shows a blank white area where the video should be.",
      status: TicketStatus.OPEN,
      category: TicketCategory.TECHNICAL_QUESTION,
      priority: TicketPriority.URGENT,
      senderName: "Bob Wilson",
      senderEmail: "bob.wilson@example.com",
    }
  ];

  for (let i = 1; i <= 100; i++) {
    let category: TicketCategory;
    let subject: string;
    let description: string;

    const catRand = i % 3;
    if (catRand === 0) {
      category = TicketCategory.TECHNICAL_QUESTION;
      const idx = i % SUBJECTS_TECHNICAL.length;
      subject = SUBJECTS_TECHNICAL[idx];
      description = DESCRIPTIONS_TECHNICAL[idx];
    } else if (catRand === 1) {
      category = TicketCategory.GENERAL_QUESTION;
      const idx = i % SUBJECTS_GENERAL.length;
      subject = SUBJECTS_GENERAL[idx];
      description = DESCRIPTIONS_GENERAL[idx];
    } else {
      category = TicketCategory.REFUND_REQUEST;
      const idx = i % SUBJECTS_REFUND.length;
      subject = SUBJECTS_REFUND[idx];
      description = DESCRIPTIONS_REFUND[idx];
    }

    let priority: TicketPriority;
    const prioRand = i % 4;
    if (prioRand === 0) priority = TicketPriority.LOW;
    else if (prioRand === 1) priority = TicketPriority.MEDIUM;
    else if (prioRand === 2) priority = TicketPriority.HIGH;
    else priority = TicketPriority.URGENT;

    let status: TicketStatus;
    const statusRand = i % 3;
    if (statusRand === 0) status = TicketStatus.OPEN;
    else if (statusRand === 1) status = TicketStatus.RESOLVED;
    else status = TicketStatus.CLOSED;

    let assignedToId: string | null = null;
    if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED || i % 2 === 0) {
      assignedToId = (i % 2 === 0) ? agent1.id : agent2.id;
    }

    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const senderName = `${firstName} ${lastName}`;
    const senderEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

    const createdAt = new Date(Date.now() - (i * 6 * 60 * 60 * 1000));
    const resolvedAt = (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) 
      ? new Date(createdAt.getTime() + (i * 2 * 60 * 60 * 1000))
      : null;
    const closedAt = (status === TicketStatus.CLOSED)
      ? new Date(createdAt.getTime() + (i * 3 * 60 * 60 * 1000))
      : null;

    ticketDataList.push({
      subject,
      description,
      status,
      category,
      priority,
      senderName,
      senderEmail,
      assignedToId,
      createdAt,
      resolvedAt,
      closedAt,
    });
  }

  const createdTickets = [];
  for (const t of ticketDataList) {
    const created = await prisma.ticket.create({ data: t });
    createdTickets.push(created);
  }
  console.log(`  ✅ Created ${createdTickets.length} support tickets`);

  // Create specific comments for the first ticket (Cannot access my course materials)
  await prisma.comment.create({
    data: {
      body: "Hi John, I can see the issue on your account. Let me escalate this to our technical team. In the meantime, could you try logging out and back in?",
      ticketId: createdTickets[0].id,
      authorId: agent1.id,
    },
  });

  await prisma.comment.create({
    data: {
      body: "Based on the ticket details, this appears to be an enrollment sync issue. The student's payment was processed but the enrollment record was not created in the LMS.",
      ticketId: createdTickets[0].id,
      authorId: agent1.id,
      isInternal: true,
      isAiGenerated: true,
    },
  });

  // Create sample comments for some of the other tickets
  for (let i = 1; i < 15; i++) {
    const ticket = createdTickets[i * 6];
    if (ticket && ticket.assignedToId) {
      await prisma.comment.create({
        data: {
          body: `Hi ${ticket.senderName}, we are currently looking into your request. We'll update you as soon as possible.`,
          ticketId: ticket.id,
          authorId: ticket.assignedToId,
        }
      });
    }
  }
  console.log("  ✅ Created sample comments for selected tickets");
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
