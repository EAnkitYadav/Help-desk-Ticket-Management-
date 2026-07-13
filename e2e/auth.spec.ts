import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('admin can successfully sign in and see dashboard', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Helpdesk' })).toBeVisible();

    await page.locator('#login-email').fill('admin@example.com');
    await page.locator('#login-password').fill('password@123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();
    await expect(page.getByText('Admin User')).toBeVisible();
  });

  test('support agent can successfully sign in', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-email').fill('agent1@example.com');
    await page.locator('#login-password').fill('password@123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('/dashboard');
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
  });

  test('invalid credentials display an error message', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-email').fill('admin@example.com');
    await page.locator('#login-password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText(/Invalid email or password|Login failed/i)).toBeVisible();
  });

  test('user can sign out successfully', async ({ page }) => {
    // 1. Sign in
    await page.goto('/login');
    await page.locator('#login-email').fill('admin@example.com');
    await page.locator('#login-password').fill('password@123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/dashboard');

    // 2. Sign out
    await page.locator('#top-navbar-signout-btn').click();
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { name: 'Helpdesk' })).toBeVisible();
  });
});
