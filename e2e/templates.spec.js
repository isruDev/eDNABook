import { test, expect } from '@playwright/test';

test.describe('Metadata templates (#6 #7)', () => {
  test('Aquatic eDNA project: toggle fields, required fields block save, then save', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/');
    await page.click('#new-project-btn');
    await page.fill('#project-title-input', 'Template Lake');

    await page.click('#preset-picker [data-preset="aquatic"]');
    await expect(page.locator('#builtin-fields button')).toHaveCount(7);
    await expect(page.locator('#preset-fields [aria-pressed="true"]')).toHaveCount(17);
    await page.click('#preset-fields [data-key="turbidity"]');
    await expect(page.locator('#preset-fields [aria-pressed="true"]')).toHaveCount(16);
    await page.click('#save-project-btn');

    await page.waitForSelector('#dashboard-title');
    await expect(page.locator('#dashboard-fields .field-tag')).toHaveCount(16);
    await expect(page.locator('#dashboard-fields')).not.toContainText('Turbidity');

    await page.click('#scan-btn');
    await page.click('#manual-entry-btn');
    await page.fill('#manual-sample-id', 'TPL-001');
    await page.click('#scanner-container .btn-primary');
    await page.click('#skip-photo-btn');
    await page.waitForSelector('#sample-form', { state: 'visible' });

    await expect(page.locator('select[data-field="sample_type"]')).toBeVisible();
    await expect(page.locator('[data-field="volume_filtered_ml"]')).toHaveAttribute('inputmode', 'decimal');

    await page.click('#sample-form button[type="submit"]');
    await expect(page.locator('#sample-form')).toBeVisible();
    await expect(page.locator('.field-missing').first()).toBeVisible();

    await page.fill('[data-field="samplers"]', 'LS, AT');
    await page.fill('[data-field="site_name"]', 'Canada: Ontario, Lake Opinicon');
    await page.selectOption('[data-field="sample_type"]', 'Field Sample');
    await page.selectOption('[data-field="env_medium"]', 'Freshwater');
    await page.selectOption('[data-field="collection_method"]', 'Peristaltic pump');
    await page.fill('[data-field="volume_filtered_ml"]', '1000');
    await page.selectOption('[data-field="filter"]', '0.22 µm Sterivex (PES)');
    await page.selectOption('[data-field="preservation"]', 'Frozen (-20°C)');
    for (const key of ['qaqc_gloves_used', 'qaqc_gear_decon', 'qaqc_sample_sealed']) {
      await page.check(`[data-field="${key}"]`);
    }
    await page.click('#sample-form button[type="submit"]');

    await page.waitForSelector('.sample-card');
    await page.click('.sample-card');
    await expect(page.locator('#sample-detail-content')).toContainText('Lake Opinicon');
    await expect(page.locator('#sample-detail-content')).toContainText('Sterivex');
  });

  test('editing a project keeps the template toggles and hides the picker', async ({ page }) => {
    await page.goto('/');
    await page.click('#new-project-btn');
    await page.fill('#project-title-input', 'Template Tissue');
    await page.click('#preset-picker [data-preset="organismal"]');
    await page.click('#preset-fields [data-key="sex"]');
    await page.click('#save-project-btn');
    await page.waitForSelector('#dashboard-title');

    await page.click('#edit-project-btn');
    await expect(page.locator('#preset-picker')).toBeHidden();
    await expect(page.locator('#preset-fields [data-key="sex"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#preset-fields [data-key="taxon_id"]')).toHaveAttribute('aria-pressed', 'true');
  });
});
