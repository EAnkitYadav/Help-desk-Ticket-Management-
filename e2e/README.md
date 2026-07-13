# Playwright E2E Testing Setup

This directory is configured for end-to-end (E2E) testing using **Playwright** with an isolated PostgreSQL testing database (`helpdesk_test`).

## Configuration Overview

- **Configuration File**: `playwright.config.ts` in the project root.
- **Test Database**: `helpdesk_test` on `localhost:5432`.
- **Test Server Port**: `3002` (Backend API during testing).
- **Test Client Port**: `5174` (Frontend Vite dev server during testing).
- **Isolation**: When tests run, they execute against dedicated ports (`3002` and `5174`) and the separate `helpdesk_test` database so that local development servers and the dev database (`helpdesk`) remain unaffected.

## Available Scripts

From the root directory, you can run the following commands:

```bash
# Run all E2E tests (automatically synchronizes schema to helpdesk_test first)
bun run test:e2e

# Open interactive Playwright UI for debugging and running tests
bun run test:e2e:ui

# View HTML report of the last test run
bun run test:e2e:report

# Manually synchronize Prisma schema to the helpdesk_test database
bun run db:test:prepare
```

## Adding Tests

Place your Playwright test files in this directory with the `.spec.ts` or `.test.ts` extension:
```ts
// e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test('homepage has title and navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Helpdesk/);
});
```
