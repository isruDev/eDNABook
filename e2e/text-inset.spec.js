import { test, expect } from '@playwright/test';

/** Minimum space (px) between text and the edge of a bordered or filled box. */
const MIN_INSET = 8;

/**
 * Lists visible elements whose own text sits closer than MIN_INSET to their
 * visible edge (a border, an outline, or a background that differs from the
 * parent's).
 *
 * @param {import('@playwright/test').Page} page - Page on the screen to check.
 * @returns {Promise<string[]>} One line per offending element: selector, side, inset.
 */
function crampedText(page) {
  return page.evaluate((min) => {
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

    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || !hasEdge(el)) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
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
  }, MIN_INSET);
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
