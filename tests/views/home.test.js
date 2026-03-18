import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the db module before importing home.js
vi.mock('../../js/db.js', () => ({
  getAllProjects: vi.fn(),
  getSamplesByProject: vi.fn(),
}));

// Mock the ui module
vi.mock('../../js/ui.js', () => ({
  showView: vi.fn(),
  formatDate: vi.fn(iso => `formatted:${iso}`),
  clearElement: vi.fn(el => { el.innerHTML = ''; }),
  createElement: vi.fn((tag, attrs, children) => {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') el.className = v;
        else el.setAttribute(k, v);
      }
    }
    if (typeof children === 'string') el.textContent = children;
    else if (Array.isArray(children)) {
      for (const c of children) { if (c != null) el.appendChild(c); }
    }
    return el;
  }),
}));

// Mock app.js navigate
vi.mock('../../js/app.js', () => ({
  navigate: vi.fn(),
}));

import { getAllProjects, getSamplesByProject } from '../../js/db.js';
import { navigate } from '../../js/app.js';
import { showView } from '../../js/ui.js';
import { renderHome } from '../../js/views/home.js';

// ---------------------------------------------------------------------------
// DOM setup
// ---------------------------------------------------------------------------

function setupDOM() {
  document.body.innerHTML = `
    <div id="app">
      <div class="view active" data-view="home">
        <header><h1>eDNA Logger</h1></header>
        <div id="home-actions"></div>
        <div id="project-list"></div>
      </div>
    </div>
    <div id="toast-container"></div>
  `;
}

beforeEach(() => {
  setupDOM();
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// renderHome tests
// ---------------------------------------------------------------------------

describe('renderHome', () => {
  it('calls showView with "home"', async () => {
    getAllProjects.mockResolvedValue([]);
    await renderHome();
    expect(showView).toHaveBeenCalledWith('home');
  });

  it('renders the New Project button', async () => {
    getAllProjects.mockResolvedValue([]);
    await renderHome();
    const btn = document.getElementById('new-project-btn');
    expect(btn).not.toBeNull();
  });

  it('renders a project card for each project', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'p1', content: 'River Survey\nCollector\nSite', updatedAt: '2026-03-17T10:00:00.000Z' },
      { id: 'p2', content: 'Lake Study\nDepth', updatedAt: '2026-03-16T08:00:00.000Z' },
    ]);
    getSamplesByProject.mockResolvedValue([]);
    await renderHome();
    const cards = document.querySelectorAll('.project-card');
    expect(cards.length).toBe(2);
  });

  it('displays the correct title in each project card', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'p1', content: 'River Survey\nCollector\nSite', updatedAt: '2026-03-17T10:00:00.000Z' },
    ]);
    getSamplesByProject.mockResolvedValue([]);
    await renderHome();
    const card = document.querySelector('.project-card');
    expect(card.querySelector('h2').textContent).toBe('River Survey');
  });

  it('displays field count in card meta', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'p1', content: 'Survey\nField1\nField2\nField3', updatedAt: '2026-03-17T10:00:00.000Z' },
    ]);
    getSamplesByProject.mockResolvedValue([]);
    await renderHome();
    const meta = document.querySelector('.card-meta');
    expect(meta.textContent).toContain('3 fields');
  });

  it('displays sample count in card meta', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'p1', content: 'Survey\nField1', updatedAt: '2026-03-17T10:00:00.000Z' },
    ]);
    getSamplesByProject.mockResolvedValue([
      { id: 's1' }, { id: 's2' },
    ]);
    await renderHome();
    const meta = document.querySelector('.card-meta');
    expect(meta.textContent).toContain('2 samples');
  });

  it('renders empty state when no projects exist', async () => {
    getAllProjects.mockResolvedValue([]);
    await renderHome();
    const emptyState = document.querySelector('.empty-state');
    expect(emptyState).not.toBeNull();
  });

  it('does not render empty state when projects exist', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'p1', content: 'Survey\nField1', updatedAt: '2026-03-17T10:00:00.000Z' },
    ]);
    getSamplesByProject.mockResolvedValue([]);
    await renderHome();
    const emptyState = document.querySelector('.empty-state');
    expect(emptyState).toBeNull();
  });

  it('clicking a project card navigates to project dashboard', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'project-uuid-1', content: 'Survey\nField1', updatedAt: '2026-03-17T10:00:00.000Z' },
    ]);
    getSamplesByProject.mockResolvedValue([]);
    await renderHome();
    const card = document.querySelector('.project-card');
    card.click();
    expect(navigate).toHaveBeenCalledWith('#/project/project-uuid-1');
  });

  it('clicking New Project button navigates to project-new', async () => {
    getAllProjects.mockResolvedValue([]);
    await renderHome();
    const btn = document.getElementById('new-project-btn');
    btn.click();
    expect(navigate).toHaveBeenCalledWith('#/project/new');
  });
});
