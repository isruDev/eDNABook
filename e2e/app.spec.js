import { test, expect } from '@playwright/test';

test.describe('eDNALite PWA', () => {
  test('loads home screen with New Project button', async ({ page }) => {
    await page.goto('/');
    // Wait for the app to initialize and render home view
    await page.waitForSelector('#new-project-btn', { state: 'visible', timeout: 5000 });
    await expect(page.locator('h1')).toContainText('eDNALite');
    await expect(page.locator('#new-project-btn')).toBeVisible();
  });

  test('create a project and navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#new-project-btn', { state: 'visible' });

    // Click New Project
    await page.click('#new-project-btn');
    await page.waitForSelector('#project-title-input', { state: 'visible' });

    // Fill in project title
    await page.fill('#project-title-input', 'Test River Survey');

    // Add metadata fields
    await page.click('#add-field-btn');
    await page.locator('#field-list input[type="text"]').first().fill('Water Depth');

    await page.click('#add-field-btn');
    await page.locator('#field-list input[type="text"]').nth(1).fill('Turbidity');

    // Save project
    await page.click('#save-project-btn');

    // Wait for dashboard to render
    await page.waitForSelector('#dashboard-title', { state: 'visible', timeout: 5000 });

    // Dashboard should show project title
    await expect(page.locator('#dashboard-title')).toContainText('Test River Survey');

    // Should show field tags
    await expect(page.locator('.field-tag')).toHaveCount(2);
  });

  test('manual sample entry saves and appears in dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#new-project-btn', { state: 'visible' });

    // Create a project first
    await page.click('#new-project-btn');
    await page.waitForSelector('#project-title-input', { state: 'visible' });
    await page.fill('#project-title-input', 'Sample Test Project');
    await page.click('#add-field-btn');
    await page.locator('#field-list input[type="text"]').first().fill('Site Name');
    await page.click('#save-project-btn');

    // Wait for dashboard
    await page.waitForSelector('#scan-btn', { state: 'visible', timeout: 5000 });

    // Click Scan Sample
    await page.click('#scan-btn');
    await page.waitForSelector('#manual-entry-btn', { state: 'visible', timeout: 5000 });

    // Use manual entry
    await page.click('#manual-entry-btn');
    await page.waitForSelector('#manual-sample-id', { state: 'visible' });

    // Fill in the manual ID and submit
    await page.fill('#manual-sample-id', 'SAMPLE-001');
    await page.click('#scanner-container .btn-primary');

    // Wait for form to appear
    await page.waitForSelector('#sample-form', { state: 'visible', timeout: 5000 });

    // Sample ID should be displayed
    await expect(page.locator('#display-sample-id')).toContainText('SAMPLE-001');

    // Fill in metadata
    const metadataInputs = page.locator('#metadata-fields input[type="text"]');
    await metadataInputs.first().fill('North Bank');

    // Save sample
    await page.click('#sample-form button[type="submit"]');

    // Should navigate back to dashboard - wait for sample card
    await page.waitForSelector('.sample-card', { state: 'visible', timeout: 5000 });

    // Sample should appear in list
    await expect(page.locator('.sample-card')).toContainText('SAMPLE-001');
  });

  test('project appears on home after creation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#new-project-btn', { state: 'visible' });

    // Create a project
    await page.click('#new-project-btn');
    await page.waitForSelector('#project-title-input', { state: 'visible' });
    await page.fill('#project-title-input', 'Home List Test');
    await page.click('#save-project-btn');

    // Wait for dashboard
    await page.waitForSelector('#dashboard-title', { state: 'visible', timeout: 5000 });

    // Navigate home
    await page.goto('/');
    await page.waitForSelector('.project-card', { state: 'visible', timeout: 5000 });

    // Project card should be visible
    await expect(page.locator('.project-card')).toContainText('Home List Test');
  });
});
