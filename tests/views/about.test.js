// tests/views/about.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/ui.js', () => ({
  showView: vi.fn(),
  clearElement: vi.fn((el) => { el.innerHTML = ''; }),
  createElement: vi.fn((tag, attrs, text) => {
    const el = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'textContent') el.textContent = v;
      else el.setAttribute(k, v);
    });
    if (typeof text === 'string') el.textContent = text;
    return el;
  }),
}));

vi.mock('../../js/app.js', () => ({
  navigate: vi.fn(),
}));

import { showView, clearElement } from '../../js/ui.js';
import { navigate } from '../../js/app.js';
import { renderAbout } from '../../js/views/about.js';

beforeEach(() => {
  document.body.innerHTML = `
    <div class="view" data-view="about">
      <button class="btn-back">Back</button>
      <div id="about-content"></div>
    </div>
  `;
  vi.clearAllMocks();
});

describe('renderAbout', () => {
  it('calls showView with "about"', async () => {
    await renderAbout();
    expect(showView).toHaveBeenCalledWith('about');
  });

  it('renders the app name eDNALite', async () => {
    await renderAbout();
    expect(document.getElementById('about-content').textContent).toContain('eDNALite');
  });

  it('renders a version string', async () => {
    await renderAbout();
    const content = document.getElementById('about-content').textContent;
    expect(content).toMatch(/\d+\.\d+\.\d+/);
  });

  it('renders the description text', async () => {
    await renderAbout();
    const content = document.getElementById('about-content').textContent;
    expect(content).toContain('environmental DNA');
  });

  it('renders a link to the GitHub repository', async () => {
    await renderAbout();
    const link = document.querySelector('#about-content a');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toContain('github.com');
  });

  it('back button navigates to home', async () => {
    await renderAbout();
    document.querySelector('.btn-back').click();
    expect(navigate).toHaveBeenCalledWith('#/');
  });
});
