---
name: playwright-e2e-testing
description: Guidelines and instructions for writing end-to-end (E2E) tests using Playwright in the Helpdesk monorepo. Use when writing tests, debugging Playwright failures, or working with e2e/ directory, playwright.config.ts, or test servers on ports 3002 and 5174.
---

# Playwright E2E Testing Guide

This skill provides established patterns and best practices for writing and executing end-to-end (E2E) tests using Playwright in the Helpdesk monorepo.

---

## 1. Testing Environment Architecture

To prevent interference with local development servers and live databases, E2E tests run against a dedicated, isolated test infrastructure:

- **Database**: PostgreSQL database named `helpdesk_test` running on `localhost:5432`.
- **Backend API Server**: Runs on port `3002` (via `bun run --filter server dev` with `NODE_ENV=test` and `DATABASE_URL` pointing to `helpdesk_test`).
- **Frontend Client Dev Server**: Runs on port `5174` (via `bun run --filter client dev` configured with `VITE_API_URL=http://localhost:3002`).
- **Base URL**: Playwright is configured with `baseURL: "http://localhost:5174"`. All relative `page.goto('/')` calls navigate to the test client server.

---

## 2. Test Commands & Scripts

Run these commands from the monorepo root:

- **Run all E2E tests headless**:
  ```bash
  bun run test:e2e
  ```
  *(Automatically runs `db:test:prepare` first to push schema and seed test data)*

- **Open interactive Playwright UI**:
  ```bash
  bun run test:e2e:ui
  ```

- **View HTML Test Report**:
  ```bash
  bun run test:e2e:report
  ```

- **Manually reset/prepare test database**:
  ```bash
  bun run db:test:prepare
  ```

---

## 3. Seeded Test Accounts & Initial Data

When `db:test:prepare` executes, it seeds `helpdesk_test` with initial users and tickets. You can use these default credentials in your test suites:

| Role | Email | Password | Name |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `password@123` | Admin User |
| **Agent** | `agent1@example.com` | `password@123` | Sarah Johnson |
| **Agent** | `agent2@example.com` | `password@123` | Mike Chen |

---

## 4. Best Practices for Writing Tests

### File Placement & Naming
Place all test files inside the `/e2e` folder with `.spec.ts` extension (e.g., `e2e/auth.spec.ts`, `e2e/users.spec.ts`).

### Robust Selectors
Prefer user-facing attributes and semantic locators:
- `page.getByRole('button', { name: 'Sign In' })`
- `page.getByLabel('Email Address')`
- `page.getByPlaceholder('name@company.com')`
- `page.getByText('Open Tickets')`

### Handling Authentication in Tests
When testing protected routes or performing admin actions:
1. Navigate to `/login`.
2. Fill the email and password fields.
3. Submit the form and wait for URL redirection (e.g., `await page.waitForURL('/')`).
4. Verify that navigation navbar shows the logged-in user or expected links.

### Example: Creating a New Agent (Admin Workflow)
```typescript
import { test, expect } from '@playwright/test';

test('admin can create a new support agent', async ({ page }) => {
  // 1. Log in as Admin
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@example.com');
  await page.locator('#login-password').fill('password@123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');

  // 2. Navigate to Users page (Admin only)
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

  // 3. Open Create Agent Modal or Form
  await page.getByRole('button', { name: 'Add Agent' }).click();
  await page.getByLabel('Name').fill('Test Agent Playwright');
  await page.getByLabel('Email').fill('test.agent.playwright@example.com');
  await page.getByLabel('Password').fill('password@123');

  // 4. Submit and verify entry in user list
  await page.getByRole('button', { name: 'Create Agent' }).click();
  await expect(page.getByText('test.agent.playwright@example.com')).toBeVisible();
});
```

---

## 5. Troubleshooting & Gotchas

1. **Port Conflicts**: Ensure nothing else is using port `3002` or `5174` before running tests. Playwright's `webServer` config will attempt to start the test servers automatically.
2. **State Persistence Across Tests**: Because tests execute against a persistent PostgreSQL database (`helpdesk_test`), avoid hardcoding unique constraints (like email addresses) without timestamps or random suffixes if tests run multiple times without re-seeding. Use email patterns like `agent.${Date.now()}@example.com` when creating dynamic test records.
3. **CORS & Cookies**: Better Auth sets secure cookies. The CORS whitelist on the test backend (`port 3002`) explicitly permits requests from `http://localhost:5174` with credentials enabled.
