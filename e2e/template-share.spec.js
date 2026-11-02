import { test, expect } from '@playwright/test';

test.describe('Template sharing (#9)', () => {
  test('share a template file, import it as a new project, copy the summary', async ({ page, context }) => {
    // Force the download fallback so the test can capture the file.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await page.click('#new-project-btn');
    await page.fill('#project-title-input', 'Shared Lake');
    await page.click('#preset-picker [data-preset="aquatic"]');
    await page.click('#preset-fields [data-key="turbidity"]');
    await page.click('#save-project-btn');
    await page.waitForSelector('#dashboard-title');
    await expect(page.locator('#dashboard-fields .field-tag')).toHaveCount(16);

    const downloadPromise = page.waitForEvent('download');
    await page.click('#share-template-btn');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Shared_Lake_template.json');
    const templatePath = await download.path();

    await page.click('#copy-summary-btn');
    await expect(page.locator('#toast-container')).toContainText('Summary copied');
    const summary = await page.evaluate(() => navigator.clipboard.readText());
    expect(summary).toContain('Sample metadata were recorded in the field with eDNALite.');
    expect(summary).toContain('Conductivity (µS/cm');
    expect(summary).not.toContain('Turbidity');
    expect(summary).toMatch(/QA\/QC checks confirmed for every sample: .*Sterile Gloves/);

    await page.click('#more-btn');
    const chooserPromise = page.waitForEvent('filechooser');
    await page.click('.more-modal-item:has-text("Import Template")');
    const chooser = await chooserPromise;
    await chooser.setFiles(templatePath);

    await expect(page.locator('#dashboard-title')).toHaveText('Shared Lake 2');
    await expect(page.locator('#dashboard-fields .field-tag')).toHaveCount(16);
    await expect(page.locator('#dashboard-fields')).not.toContainText('Turbidity');
  });

  test('importing a file that is not a template shows an error and creates nothing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#project-list')).toBeVisible();

    await page.click('#more-btn');
    const chooserPromise = page.waitForEvent('filechooser');
    await page.click('.more-modal-item:has-text("Import Template")');
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });

    await expect(page.locator('#toast-container')).toContainText('not an eDNALite template');
    await expect(page.locator('.project-card')).toHaveCount(0);
  });
});
