import { test, expect } from '@playwright/test';

/** Minimum vertical gap (px) between an Edit button and its Delete button. */
const MIN_EDIT_DELETE_GAP = 150;

/**
 * Creates a project with one text field and logs one sample through manual
 * entry, ending on the project dashboard.
 *
 * @param {import('@playwright/test').Page} page - Playwright page.
 * @param {string} title - Project title (must be unique per test).
 * @returns {Promise<void>}
 */
async function createProjectWithSample(page, title) {
  await page.goto('/');
  await page.waitForSelector('#new-project-btn', { state: 'visible' });
  await page.click('#new-project-btn');
  await page.fill('#project-title-input', title);
  await page.click('#add-field-btn');
  await page.locator('#field-list input[type="text"]').first().fill('Site Name');
  await page.click('#save-project-btn');
  await page.waitForSelector('#scan-btn', { state: 'visible' });

  await page.click('#scan-btn');
  await page.click('#manual-entry-btn');
  await page.fill('#manual-sample-id', 'ERGO-001');
  await page.click('#scanner-container .btn-primary');
  await page.click('#skip-photo-btn');
  await page.waitForSelector('#sample-form', { state: 'visible' });
  await page.locator('#metadata-fields input[type="text"]').first().fill('North Bank');
  await page.click('#sample-form button[type="submit"]');
  await page.waitForSelector('.sample-card', { state: 'visible' });
}

/**
 * Returns the vertical gap between the bottom of one element and the top of another.
 *
 * @param {import('@playwright/test').Locator} upper - Element expected higher on the page.
 * @param {import('@playwright/test').Locator} lower - Element expected lower on the page.
 * @returns {Promise<number>} lower.top - upper.bottom in CSS pixels.
 */
async function verticalGap(upper, lower) {
  const a = await upper.boundingBox();
  const b = await lower.boundingBox();
  return b.y - (a.y + a.height);
}

/**
 * Collects size problems for visible buttons and text on the current view.
 *
 * @param {import('@playwright/test').Page} page - Playwright page.
 * @returns {Promise<string[]>} One message per button under 44px tall or text under 12px.
 */
async function sizeProblems(page) {
  return page.evaluate(() => {
    const problems = [];
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const view = document.querySelector('.view.active') ?? document.body;
    view.querySelectorAll('button').forEach((b) => {
      if (visible(b) && b.getBoundingClientRect().height < 44) {
        problems.push(`button "${b.textContent.trim()}" is ${Math.round(b.getBoundingClientRect().height)}px tall`);
      }
    });
    view.querySelectorAll('*').forEach((el) => {
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const size = parseFloat(getComputedStyle(el).fontSize);
      // font-size 0 is a deliberate visual hide (e.g. Back draws its label with ::before/::after)
      if (ownText && visible(el) && size > 0 && size < 12) {
        problems.push(`"${el.textContent.trim().slice(0, 30)}" is ${getComputedStyle(el).fontSize}`);
      }
    });
    return problems;
  });
}

test.describe('Edit and Delete are far apart (#12)', () => {
  test('sample detail: Edit above the sample data, Delete below it', async ({ page }) => {
    await createProjectWithSample(page, 'Ergo Detail');
    await page.click('.sample-card');
    await page.waitForSelector('#sample-detail-content .detail-row', { state: 'visible' });

    const edit = page.locator('#edit-sample-btn');
    const content = page.locator('#sample-detail-content');
    const del = page.locator('#delete-sample-btn');
    expect(await verticalGap(edit, content)).toBeGreaterThanOrEqual(0);
    expect(await verticalGap(content, del)).toBeGreaterThanOrEqual(0);
    expect(await verticalGap(edit, del)).toBeGreaterThanOrEqual(MIN_EDIT_DELETE_GAP);
  });

  test('project dashboard: Edit by the title, Delete at the bottom', async ({ page }) => {
    await createProjectWithSample(page, 'Ergo Dashboard');
    const edit = page.locator('#edit-project-btn');
    const del = page.locator('#delete-project-btn');
    expect(await verticalGap(edit, page.locator('#scan-btn'))).toBeGreaterThanOrEqual(0);
    expect(await verticalGap(edit, del)).toBeGreaterThanOrEqual(MIN_EDIT_DELETE_GAP);
  });
});

test.describe('Field-ready sizing (#14)', () => {
  for (const scheme of ['light', 'dark']) {
    test(`buttons at least 44px and text at least 12px (${scheme})`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.emulateMedia({ colorScheme: scheme });
      await createProjectWithSample(page, `Ergo Size ${scheme}`);

      expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)))
        .toBeGreaterThanOrEqual(18);
      expect(await sizeProblems(page)).toEqual([]);

      await page.click('.sample-card');
      await page.waitForSelector('#sample-detail-content .detail-row', { state: 'visible' });
      expect(await sizeProblems(page)).toEqual([]);

      const noHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );
      expect(noHorizontalScroll).toBe(true);
    });
  }

  test('choosing Dark in settings gets the same text size as system dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForSelector('#new-project-btn', { state: 'visible' });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)))
      .toBeGreaterThanOrEqual(18);
  });
});
