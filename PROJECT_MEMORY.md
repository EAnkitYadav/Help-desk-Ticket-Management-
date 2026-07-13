# AI-Powered Helpdesk Project Memory & Status

This document tracks the architectural decisions, established patterns, implemented features, and current status of the Helpdesk project.

---

## 1. Monorepo & System Architecture

- **Root Structure**: Monorepo managed with Bun and NPM workspaces (`packages/client`, `packages/server`).
- **Server (`packages/server`)**:
  - Express.js with TypeScript running on port 3001.
  - Built with `bun build src/index.ts --outdir dist --target bun`.
  - Prisma ORM (`@prisma/client` v6.10.1) connecting to PostgreSQL.
  - CORS configured with a dynamic whitelist allowing `http://localhost:5173` and `http://localhost:5174`.
- **Client (`packages/client`)**:
  - React 18 with TypeScript and Vite (dev server on port 5173).
  - React Router for SPA routing.
  - Tailwind CSS v4 styling with clean, minimalist white UI design (Shadcn UI inspired aesthetics).

---

## 2. Authentication System (Better Auth)

- **Implementation**: Better Auth integrated as a server-only handler mounted at `/api/auth/*splat` (mounted *before* `express.json()` middleware).
- **Database Adapter**: `prismaAdapter(prisma, { provider: "postgresql" })`.
- **Session Management**: Persistent database-backed sessions with secure cookies.
- **Rate Limiting**: Configured in `auth.ts` to be enabled **exclusively in the production environment** (`process.env.NODE_ENV === "production"`). In development and test environments, rate limiting is bypassed to facilitate E2E testing and rapid local development.
- **Client Integration**:
  - `authClient` imported from `better-auth/react`.
  - Reactive session state managed via custom `AuthContext` and hooks.
  - Protected routes redirect unauthenticated users to `/login`.

---

## 3. UI/UX Design System & Form Handling

- **Aesthetics**: Clean, modern minimalist white design replacing legacy dark themes. Consistent typography, spacing, card layouts, and subtle animations.
- **Form Validation**: All forms (Login, Ticket Creation, User Management) use **React Hook Form** coupled with **Zod** schema validation for robust client-side error handling and type safety.
- **Global Styles**: Custom overrides for Chrome autofill styling to preserve design integrity.

---

## 4. Testing & Infrastructure

- **E2E Testing**: Configured with Playwright (`playwright.config.ts` and `/e2e`). Uses a dedicated test database to isolate test executions from development and production datasets.
- **Database Tools**: Prisma Studio support (`npm run db:studio`) for visual data inspection.

---

## 5. Current Implementation Status

### ✅ Completed Phases
- **Phase 1: Project Setup**: Monorepo initialization, Express TS server, React TS client, PostgreSQL + Prisma setup.
- **Phase 2: Authentication**: Better Auth integration, Login page, session middleware, logout flow, route protection, production rate limiting.
- **Phase 3: User Management**: Admin-only Users page (`UsersPage.tsx`), CRUD endpoints for agents/admins, role-based access control (Admin vs. Agent).
- **Phase 4: Ticket CRUD**: Full ticket lifecycle management. Creation (`CreateTicketPage.tsx`), filtering/sorting list view (`TicketsPage.tsx`), detailed conversation view (`TicketDetailPage.tsx`), status and assignment updates.
- **Phase 7: Dashboard**: Executive overview (`DashboardPage.tsx`) featuring real-time ticket counts (Open, Resolved, Closed), category breakdown charts, recent activity lists, and quick-nav filters.

### ⏳ Next Phases (Pending)
- **Phase 5: AI Features**:
  - Claude / Gemini API integration.
  - Auto-classification of incoming tickets by category and priority.
  - AI ticket summaries and suggested reply generation for agents.
  - Knowledge base management and semantic retrieval.
- **Phase 6: Email Integration**:
  - SendGrid / Mailgun webhook handling for inbound email ticket creation.
  - Outbound email replies linked via email threading headers (`message-id`, `in-reply-to`).
- **Phase 8: Polish & Deployment**:
  - Comprehensive Dockerization (`Dockerfile` for client and server, `docker-compose.yml`).
  - Production deployment scripts and environment hardening.
