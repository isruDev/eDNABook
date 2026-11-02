// Screenshot walkthrough: project setup, custom field creation, GPS, sample
// entry, edit history, and export. Run with `npm run screenshots`.
import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEME = process.env.SCHEME === 'dark' ? 'dark' : 'light';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/walkthrough');
mkdirSync(OUT, { recursive: true });

/**
 * Saves a full-page screenshot once animations and toasts have settled.
 *
 * @param {import('@playwright/test').Page} page - Playwright page.
 * @param {string} name - File name without extension.
 * @returns {Promise<void>}
 */
async function shot(page, name) {
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${OUT}/${SCHEME}-${name}.png` });
}

test('walkthrough', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#new-project-btn');

  await page.click('#new-project-btn');
  await page.fill('#project-title-input', 'Lake Opinicon 2026');
  await page.click('#preset-picker [data-preset="aquatic"]');
  await shot(page, '01-new-project-template');

  await page.click('#preset-fields [data-key="turbidity"]');
  await page.click('#add-field-btn');
  await page.locator('#field-list .field-row input').first().fill('Weather');
  await page.locator('#add-field-btn').scrollIntoViewIfNeeded();
  await shot(page, '02-custom-field');
  await page.click('#save-project-btn');

  await page.waitForSelector('#scan-btn');
  await shot(page, '03-project-dashboard');

  await page.click('#scan-btn');
  await page.click('#manual-entry-btn');
  await page.fill('#manual-sample-id', 'LO-2026-001');
  await page.click('#scanner-container .btn-primary');
  await page.waitForSelector('#skip-photo-btn');
  await shot(page, '04-photo-prompt');

  await page.click('#skip-photo-btn');
  await page.waitForSelector('#sample-form', { state: 'visible' });
  await page.fill('[data-field="samplers"]', 'H. Tian, L. Schmidt');
  await page.fill('[data-field="site_name"]', 'Canada: Ontario, Lake Opinicon');
  await page.selectOption('[data-field="sample_type"]', 'Field Sample');
  await page.selectOption('[data-field="env_medium"]', 'Freshwater');
  await page.selectOption('[data-field="collection_method"]', 'Peristaltic pump');
  await page.fill('[data-field="volume_filtered_ml"]', '1000');
  await page.selectOption('[data-field="filter"]', '0.22 µm Sterivex (PES)');
  await page.selectOption('[data-field="preservation"]', 'Frozen (-20°C)');
  await page.fill('[data-field="water_temp_c"]', '18.4');
  await page.fill('[data-field="ph"]', '7.6');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, '05-sample-entry-gps');

  for (const key of ['qaqc_gloves_used', 'qaqc_gear_decon', 'qaqc_sample_sealed']) {
    await page.check(`[data-field="${key}"]`);
  }
  await page.locator('[data-field="qaqc_sample_sealed"]').scrollIntoViewIfNeeded();
  await shot(page, '06-qaqc-checkboxes');
  await page.click('#sample-form button[type="submit"]');

  await page.waitForSelector('.sample-card');
  await page.click('.sample-card');
  await page.click('#edit-sample-btn');
  await page.fill('#edit-metadata-fields [data-field="ph"]', '7.8');
  await page.click('#edit-sample-form button[type="submit"]');
  await page.waitForSelector('#edit-history');
  await page.locator('#edit-history').scrollIntoViewIfNeeded();
  await shot(page, '07-edit-history');

  await page.click('[data-view="sample-detail"] .btn-back');
  await page.click('#export-btn');
  await shot(page, '08-export');
});
