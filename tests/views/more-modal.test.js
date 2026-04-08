// tests/views/more-modal.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/db.js', () => ({
  getAllProjects: vi.fn(),
  createProject: vi.fn(),
  parseProject: vi.fn((content) => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { title: '', fields: [] };
    const [title, ...rawFields] = lines;
    return { title, fields: rawFields.map(l => ({ name: l, type: 'text' })) };
  }),
}));

import { getAllProjects, createProject } from '../../js/db.js';
import { openMoreModal, closeMoreModal } from '../../js/views/more-modal.js';

beforeEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
  vi.clearAllMocks();
  getAllProjects.mockResolvedValue([]);
  createProject.mockResolvedValue({ id: 'new-proj-1' });
});

describe('openMoreModal', () => {
  it('appends a modal overlay to document.body', () => {
    openMoreModal();
    expect(document.querySelector('.more-modal-backdrop')).not.toBeNull();
  });

  it('modal has role=dialog and aria-modal=true', () => {
    openMoreModal();
    const modal = document.querySelector('.more-modal');
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
  });

  it('modal has aria-labelledby pointing to the title element id', () => {
    openMoreModal();
    const modal = document.querySelector('.more-modal');
    const labelId = modal.getAttribute('aria-labelledby');
    expect(document.getElementById(labelId)).not.toBeNull();
  });

  it('renders five menu items', () => {
    openMoreModal();
    const items = document.querySelectorAll('.more-modal-item');
    expect(items).toHaveLength(5);
  });

  it('menu item labels include Create Sample Project, Settings, Offline Access, and About', () => {
    openMoreModal();
    const labels = Array.from(document.querySelectorAll('.more-modal-item')).map(el => el.textContent.trim());
    expect(labels).toContain('Create Sample Project');
    expect(labels).toContain('Settings');
    expect(labels).toContain('Offline Access (iOS)');
    expect(labels).toContain('Offline Access (Android)');
    expect(labels).toContain('About eDNALite');
  });

  it('renders a close button inside the modal header', () => {
    openMoreModal();
    expect(document.querySelector('.more-modal-close')).not.toBeNull();
  });
});

describe('closeMoreModal', () => {
  it('removes the modal overlay from the DOM', () => {
    openMoreModal();
    closeMoreModal();
    expect(document.querySelector('.more-modal-backdrop')).toBeNull();
  });

  it('is safe to call when no modal is open', () => {
    expect(() => closeMoreModal()).not.toThrow();
  });
});

describe('modal dismiss', () => {
  it('X close button click removes the modal', () => {
    openMoreModal();
    document.querySelector('.more-modal-close').click();
    expect(document.querySelector('.more-modal-backdrop')).toBeNull();
  });

  it('backdrop click (outside modal card) removes the modal', () => {
    openMoreModal();
    document.querySelector('.more-modal-backdrop').click();
    expect(document.querySelector('.more-modal-backdrop')).toBeNull();
  });

  it('clicking inside the modal card does not dismiss', () => {
    openMoreModal();
    document.querySelector('.more-modal').click();
    expect(document.querySelector('.more-modal-backdrop')).not.toBeNull();
  });
});

describe('menu item navigation', () => {
  it('iOS item closes modal and sets hash to #/offline/ios', () => {
    openMoreModal();
    const items = Array.from(document.querySelectorAll('.more-modal-item'));
    const iosItem = items.find(el => el.textContent.includes('iOS'));
    iosItem.click();
    expect(document.querySelector('.more-modal-backdrop')).toBeNull();
    expect(window.location.hash).toBe('#/offline/ios');
  });

  it('Android item closes modal and sets hash to #/offline/android', () => {
    openMoreModal();
    const items = Array.from(document.querySelectorAll('.more-modal-item'));
    const androidItem = items.find(el => el.textContent.includes('Android'));
    androidItem.click();
    expect(document.querySelector('.more-modal-backdrop')).toBeNull();
    expect(window.location.hash).toBe('#/offline/android');
  });

  it('About item closes modal and sets hash to #/about', () => {
    openMoreModal();
    const items = Array.from(document.querySelectorAll('.more-modal-item'));
    const aboutItem = items.find(el => el.textContent.includes('About'));
    aboutItem.click();
    expect(document.querySelector('.more-modal-backdrop')).toBeNull();
    expect(window.location.hash).toBe('#/about');
  });
});

describe('Create Sample Project menu item', () => {
  /**
   * Finds and returns the Create Sample Project button from the opened modal.
   *
   * @returns {HTMLButtonElement}
   */
  function findCreateItem() {
    const items = Array.from(document.querySelectorAll('.more-modal-item'));
    return items.find(el => el.textContent.trim() === 'Create Sample Project');
  }

  it('creates a project with the "Sample Project" template and navigates to it', async () => {
    getAllProjects.mockResolvedValue([]);
    createProject.mockResolvedValue({ id: 'new-proj-xyz' });
    openMoreModal();

    findCreateItem().click();
    await new Promise(r => setTimeout(r, 50));

    expect(createProject).toHaveBeenCalledOnce();
    const content = createProject.mock.calls[0][0];
    expect(content.split('\n')[0]).toBe('Sample Project');
    expect(window.location.hash).toBe('#/project/new-proj-xyz');
  });

  it('appends a number suffix when name collides with existing project', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'p1', content: 'Sample Project\nField1', updatedAt: '2026-01-01' },
    ]);
    createProject.mockResolvedValue({ id: 'new-proj-2' });
    openMoreModal();

    findCreateItem().click();
    await new Promise(r => setTimeout(r, 50));

    const content = createProject.mock.calls[0][0];
    expect(content.split('\n')[0]).toBe('Sample Project 2');
  });

  it('increments past existing numbered projects', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'p1', content: 'Sample Project\nField1', updatedAt: '2026-01-01' },
      { id: 'p2', content: 'Sample Project 2\nField1', updatedAt: '2026-01-02' },
    ]);
    createProject.mockResolvedValue({ id: 'new-proj-3' });
    openMoreModal();

    findCreateItem().click();
    await new Promise(r => setTimeout(r, 50));

    const content = createProject.mock.calls[0][0];
    expect(content.split('\n')[0]).toBe('Sample Project 3');
  });

  it('rapid clicks do not create duplicate projects', async () => {
    // Same race bug Allen reported — rapid taps on the old header button
    // created multiple "Sample Project" entries. The fix must carry over to
    // the new More menu entry point.
    let createdProjects = [];
    getAllProjects.mockImplementation(async () => createdProjects.slice());
    let idCounter = 0;
    createProject.mockImplementation(async (content) => {
      await new Promise(r => setTimeout(r, 20));
      const id = `new-proj-${++idCounter}`;
      createdProjects.push({ id, content, updatedAt: new Date().toISOString() });
      return { id };
    });

    openMoreModal();
    const item = findCreateItem();
    item.click();
    item.click();
    item.click();
    await new Promise(r => setTimeout(r, 100));

    const titles = createProject.mock.calls.map(c => c[0].split('\n')[0]);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
    expect(titles.filter(t => t === 'Sample Project').length).toBeLessThanOrEqual(1);
  });

  it('closes the modal after creation completes', async () => {
    getAllProjects.mockResolvedValue([]);
    createProject.mockResolvedValue({ id: 'new-proj-1' });
    openMoreModal();

    findCreateItem().click();
    await new Promise(r => setTimeout(r, 50));

    expect(document.querySelector('.more-modal-backdrop')).toBeNull();
  });
});
