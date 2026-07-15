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

  test('agent can polish a draft reply using AI before sending', async ({ page }) => {
    // 1. Create a new ticket first to have a clean workspace
    await page.goto('/tickets');
    await page.getByRole('button', { name: '+ New Ticket' }).click();
    
    const uniqueSubject = `Polish Test Issue ${Date.now()}`;
    await page.getByPlaceholder('customer@example.com').fill('polish.customer@example.com');
    await page.getByPlaceholder('John Doe').fill('Polish Customer');
    await page.getByPlaceholder('Brief summary of the issue').fill(uniqueSubject);
    await page.getByPlaceholder('Describe the issue in detail…').fill('Need help with account settings.');
    await page.getByRole('button', { name: 'Create Ticket' }).click();

    // Should navigate to ticket detail page
    await page.waitForURL(/\/tickets\/.+/);

    // Get the textarea and type a draft response
    const textarea = page.getByPlaceholder('Write your reply to the customer...');
    await textarea.fill('hi please try to check your account settings again');

    // Click the Polish button
    await page.getByRole('button', { name: '✨ Polish' }).click();

    // Verify it changed to the polished version
    await expect(textarea).toHaveValue(/Dear Customer/);
    await expect(textarea).toHaveValue(/Please try to check your account settings again/);

    // Click the Polish button again
    await page.getByRole('button', { name: '✨ Polish' }).click();

    // Verify it remains correctly polished and does not nest templates
    await expect(textarea).toHaveValue(/Dear Customer/);
    await expect(textarea).not.toHaveValue(/Dear Customer,[\s\S]*?Dear Customer/);
    await expect(textarea).toHaveValue(/Please try to check your account settings again/);

    // Submit the polished reply
    await page.getByRole('button', { name: 'Send Reply' }).click();

    // Verify that the reply appears in the reply thread list
    await expect(page.getByText('Please try to check your account settings again')).toBeVisible();
  });

  test('agent can summarize a ticket and conversation history', async ({ page }) => {
    // 1. Create a new ticket first
    await page.goto('/tickets');
    await page.getByRole('button', { name: '+ New Ticket' }).click();
    
    const uniqueSubject = `Summary Test Issue ${Date.now()}`;
    await page.getByPlaceholder('customer@example.com').fill('summary.customer@example.com');
    await page.getByPlaceholder('John Doe').fill('Summary Customer');
    await page.getByPlaceholder('Brief summary of the issue').fill(uniqueSubject);
    await page.getByPlaceholder('Describe the issue in detail…').fill('We have an issue with downloading invoices.');
    await page.getByRole('button', { name: 'Create Ticket' }).click();

    // Should navigate to ticket detail page
    await page.waitForURL(/\/tickets\/.+/);

    // Click the Summarize button
    await page.getByRole('button', { name: /Summarize Ticket/i }).click();

    // Verify that the AI Summary card appears
    await expect(page.getByText('AI Summary')).toBeVisible();
    await expect(page.locator('div:has-text("AI Summary")').locator('p')).toContainText('We have an issue with downloading invoices');
  });

  test('automatically classifies a new ticket in background using AI', async ({ page }) => {
    await page.goto('/tickets');
    await page.getByRole('button', { name: '+ New Ticket' }).click();
    
    const uniqueSubject = `Billing question refund`;
    await page.getByPlaceholder('customer@example.com').fill('class.customer@example.com');
    await page.getByPlaceholder('John Doe').fill('Classification Customer');
    await page.getByPlaceholder('Brief summary of the issue').fill(uniqueSubject);
    await page.getByPlaceholder('Describe the issue in detail…').fill('I want a refund for the transaction.');
    
    // Do not select category and priority explicitly - leave as defaults/unset
    await page.locator('#ticket-category').selectOption('');
    await page.locator('#ticket-priority').selectOption('');

    await page.getByRole('button', { name: 'Create Ticket' }).click();

    // Should navigate to ticket detail page
    await page.waitForURL(/\/tickets\/.+/);

    // Since classification runs in background, we wait and verify that category select gets auto-updated to REFUND_REQUEST and priority to HIGH
    const categorySelect = page.locator('select[aria-label="Category"]');
    const prioritySelect = page.locator('select[aria-label="Priority"]');
    
    // Expect option with value REFUND_REQUEST to be selected eventually
    await expect(categorySelect).toHaveValue('REFUND_REQUEST');
    await expect(prioritySelect).toHaveValue('HIGH');
  });
});


