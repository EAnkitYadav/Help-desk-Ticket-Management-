import { test, expect } from '@playwright/test';

test.describe('Ticket Management & Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as Agent before ticket tests
    await page.goto('/login');
    await page.locator('#login-email').fill('agent1@example.com');
    await page.locator('#login-password').fill('password@123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/dashboard');
  });

  test('can view support tickets queue and filter by status', async ({ page }) => {
    await page.goto('/tickets');

    await expect(page.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();

    // Check that sample seeded ticket is present
    await expect(page.getByText('Cannot access my course materials')).toBeVisible();

    // Test status filtering
    const statusSelect = page.locator('select').nth(0);
    await statusSelect.selectOption('RESOLVED');
    await expect(page.getByText('How do I get a certificate?')).toBeVisible();
  });

  test('can create a new support ticket successfully', async ({ page }) => {
    await page.goto('/tickets');

    await page.getByRole('button', { name: '+ New Ticket' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Ticket' })).toBeVisible();

    const uniqueSubject = `Playwright E2E Test Issue ${Date.now()}`;

    // Fill fields
    await page.getByPlaceholder('customer@example.com').fill('playwright.customer@example.com');
    await page.getByPlaceholder('John Doe').fill('Playwright Customer');
    await page.getByPlaceholder('Brief summary of the issue').fill(uniqueSubject);
    await page.getByPlaceholder('Describe the issue in detail…').fill('This is an automated E2E test ticket description created via Playwright.');

    // Select category and priority
    await page.locator('#ticket-category').selectOption('TECHNICAL_QUESTION');
    await page.locator('#ticket-priority').selectOption('HIGH');

    // Submit
    await page.getByRole('button', { name: 'Create Ticket' }).click();

    // Should navigate to ticket detail page
    await expect(page).toHaveURL(/\/tickets\/.+/);
    await expect(page.getByRole('heading', { name: uniqueSubject })).toBeVisible();
    await expect(page.getByText('playwright.customer@example.com')).toBeVisible();
  });
});
