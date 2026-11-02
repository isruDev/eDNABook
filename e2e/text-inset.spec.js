import { test, expect } from '@playwright/test';

/** Minimum space (px) between text and the edge of a bordered or filled box. */
const MIN_INSET = 8;

/**
 * Small read-only pills stay compact on purpose (project rule: tight layouts),
 * so they are not held to MIN_INSET.
 */
const COMPACT_PILLS = '.field-tag, .gps-pill';

/**
 * Lists visible elements whose own text sits closer than MIN_INSET to their
 * visible edge (a border, an outline, or a background that differs from the
 * parent's).
 *
 * @param {import('@playwright/test').Page} page - Page on the screen to check.
 * @returns {Promise<string[]>} One line per offending element: selector, side, inset.
 */
function crampedText(page) {
  return page.evaluate(({ min, pills }) => {
    /**
     * Tests whether an element draws a visible boundary.
     *
     * @param {Element} el - Element to check.
     * @returns {boolean} True when it has a border, outline, or its own background.
     */
    const hasEdge = (el) => {
      const s = getComputedStyle(el);
      const border = ['Top', 'Right', 'Bottom', 'Left'].some((side) =>
        parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none');
      const outline = parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== 'none';
      const bg = s.backgroundColor;
      const parentBg = el.parentElement ? getComputedStyle(el.parentElement).backgroundColor : '';
      const filled = bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== parentBg;
      return border || outline || filled;
    };

    /**
     * Names an element for the report.
     *
     * @param {Element} el - Element to name.
     * @returns {string} Tag, id, and classes.
     */
    const name = (el) =>
      el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') +
      [...el.classList].map((c) => `.${c}`).join('');

    /**
     * Finds the element whose visible edge frames a text node: the nearest
     * ancestor (or the parent itself) with a border, outline, or own background.
     *
     * @param {Element} el - Parent element of the text node.
     * @returns {Element|null} The framing element, or null when nothing frames the text.
     */
    const frameOf = (el) => {
      for (let cur = el; cur && cur !== document.body; cur = cur.parentElement) {
        if (hasEdge(cur)) return cur;
      }
      return null;
    };

    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || !node.parentElement) continue;
      const parent = node.parentElement;
      if (getComputedStyle(parent).visibility === 'hidden') continue;
      const el = frameOf(parent);
      if (!el || el.matches(pills)) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width === 0) continue;
          const insets = { left: r.left - box.left, right: box.right - r.right, top: r.top - box.top, bottom: box.bottom - r.bottom };
          for (const [side, px] of Object.entries(insets)) {
            if (px < min) out.push(`${name(el)} "${node.textContent.trim().slice(0, 30)}" ${side} ${px.toFixed(1)}px`);
          }
        }
      }
    }
    return [...new Set(out)];
  }, { min: MIN_INSET, pills: COMPACT_PILLS });
}

test('text keeps at least 8px from the edge of bordered or filled boxes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const found = [];

  await page.goto('/');
  await page.waitForSelector('#new-project-btn');
  found.push(...await crampedText(page));

  await page.click('#new-project-btn');
  await page.fill('#project-title-input', 'Inset Lake');
  await page.click('#preset-picker [data-preset="aquatic"]');
  await page.click('#add-field-btn');
  await page.locator('#field-list .field-row input').first().fill('Weather');
  found.push(...await crampedText(page));
  await page.click('#save-project-btn');

  await page.waitForSelector('#scan-btn');
  found.push(...await crampedText(page));

  await page.click('#more-btn');
  found.push(...await crampedText(page));
  await page.click('.more-modal-close');

  await page.click('#scan-btn');
  await page.waitForTimeout(1500); // let the scanner show its camera or fallback message
  found.push(...await crampedText(page));
  await page.click('#manual-entry-btn');
  await page.fill('#manual-sample-id', 'INS-001');
  await page.click('#scanner-container .btn-primary');
  await page.waitForSelector('#skip-photo-btn');
  found.push(...await crampedText(page));
  await page.click('#skip-photo-btn');
  await page.waitForSelector('#sample-form', { state: 'visible' });
  found.push(...await crampedText(page));

  expect([...new Set(found)]).toEqual([]);
});

for (const scheme of ['light', 'dark']) {
  test(`camera-unavailable message is readable on the black scanner box (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.click('#new-project-btn');
    await page.fill('#project-title-input', 'Contrast Lake');
    await page.click('#save-project-btn');
    await page.click('#scan-btn');
    await expect(page.locator('#qr-reader')).toContainText('Camera unavailable');

    const ratio = await page.evaluate(() => {
      /**
       * Relative luminance of an "rgb(r, g, b)" color (WCAG formula).
       *
       * @param {string} css - Computed color string.
       * @returns {number} Luminance from 0 (black) to 1 (white).
       */
      const lum = (css) => {
        const [r, g, b] = css.match(/\d+/g).slice(0, 3).map((v) => {
          const c = Number(v) / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const fg = lum(getComputedStyle(document.getElementById('qr-reader')).color);
      const bg = lum(getComputedStyle(document.getElementById('scanner-container')).backgroundColor);
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
}
