import { test, expect } from '@playwright/test';

test.describe('User Management & Agent Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as Admin before each user management test
    await page.goto('/login');
    await page.locator('#login-email').fill('admin@example.com');
    await page.locator('#login-password').fill('password@123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/dashboard');
  });

  test('admin can view team members list', async ({ page }) => {
    await page.goto('/users');

    await expect(page.getByRole('heading', { name: 'Team Members' })).toBeVisible();
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
    await expect(page.getByText('Mike Chen')).toBeVisible();
  });

  test('admin can create a new support agent for this project', async ({ page }) => {
    await page.goto('/users');

    // Open Create Modal
    await page.getByRole('button', { name: '+ New Agent' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeVisible();

    // Generate unique email to avoid collisions if tests re-run
    const uniqueId = Date.now();
    const newAgentEmail = `test.agent.${uniqueId}@example.com`;
    const newAgentName = `Alex Rivera (${uniqueId})`;

    // Fill Form
    await page.getByPlaceholder('Agent Name').fill(newAgentName);
    await page.getByPlaceholder('agent@example.com').fill(newAgentEmail);
    await page.getByPlaceholder('••••••••').fill('password@123');

    // Submit
    await page.getByRole('button', { name: 'Create User' }).click();

    // Verify modal closes and new agent appears in the list
    await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeHidden({ timeout: 5000 });
    await expect(page.getByText(newAgentEmail)).toBeVisible();
    await expect(page.getByText(newAgentName)).toBeVisible();
  });

  test('deactivating an agent unassigns all of their assigned tickets', async ({ page }) => {
    // 1. Assign a ticket to Mike Chen
    await page.goto('/tickets');
    
    // Wait for the table rows to load and click the first ticket link or row
    await page.waitForSelector('tbody tr');
    await page.locator('tbody tr').first().click();
    
    // Wait for the ticket details page to load
    await page.waitForURL(/\/tickets\/[a-zA-Z0-9]+/);
    const ticketUrl = page.url();

    // Select Mike Chen in the Assignment select dropdown
    const assignmentSelect = page.getByRole('combobox', { name: 'Assignment' });
    await assignmentSelect.selectOption({ label: 'Mike Chen' });

    // Wait for auto-save API response
    await page.waitForTimeout(1000);

    // 2. Go to Users management and deactivate Mike Chen
    await page.goto('/users');
    const mikeRow = page.locator('tr', { hasText: 'Mike Chen' });
    
    // Intercept and accept the deactivation confirm dialog
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await mikeRow.getByRole('button', { name: 'Deactivate' }).click();

    // Verify Mike Chen is deactivated (the Reactivate button should now appear)
    await expect(mikeRow.getByRole('button', { name: 'Reactivate' })).toBeVisible({ timeout: 5000 });

    // 3. Navigate back to the ticket details page
    await page.goto(ticketUrl);

    // Verify the Assignment select is reset to empty string (Unassigned)
    await expect(assignmentSelect).toHaveValue('');

    // Cleanup: Reactivate Mike Chen for subsequent tests
    await page.goto('/users');
    await mikeRow.getByRole('button', { name: 'Reactivate' }).click();
    await expect(mikeRow.getByRole('button', { name: 'Deactivate' })).toBeVisible({ timeout: 5000 });
  });
});

