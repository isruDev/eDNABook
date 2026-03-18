import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  $,
  $$,
  createElement,
  clearElement,
  showView,
  showToast,
  formatDate,
  vibrate,
  confirmDialog,
} from '../js/ui.js';

// ---------------------------------------------------------------------------
// DOM setup helpers
// ---------------------------------------------------------------------------

function setupDOM() {
  document.body.innerHTML = `
    <div id="app">
      <div class="view" data-view="home"></div>
      <div class="view" data-view="project-form"></div>
      <div class="view" data-view="project-dashboard"></div>
    </div>
    <div id="toast-container"></div>
  `;
}

beforeEach(() => {
  setupDOM();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// $
// ---------------------------------------------------------------------------

describe('$', () => {
  it('returns the first matching element', () => {
    const el = $('#app');
    expect(el).not.toBeNull();
    expect(el.id).toBe('app');
  });

  it('returns null when selector does not match', () => {
    expect($('#does-not-exist')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// $$
// ---------------------------------------------------------------------------

describe('$$', () => {
  it('returns an array of all matching elements', () => {
    const views = $$('.view');
    expect(Array.isArray(views)).toBe(true);
    expect(views.length).toBe(3);
  });

  it('returns empty array when selector does not match', () => {
    expect($$('.nope')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createElement
// ---------------------------------------------------------------------------

describe('createElement', () => {
  it('creates an element with the given tag', () => {
    const el = createElement('div', {}, []);
    expect(el.tagName).toBe('DIV');
  });

  it('sets attributes on the element', () => {
    const el = createElement('input', { type: 'text', placeholder: 'Enter text' }, []);
    expect(el.getAttribute('type')).toBe('text');
    expect(el.getAttribute('placeholder')).toBe('Enter text');
  });

  it('sets class via className attribute', () => {
    const el = createElement('div', { className: 'card active' }, []);
    expect(el.className).toBe('card active');
  });

  it('sets textContent when children is a string', () => {
    const el = createElement('p', {}, 'Hello world');
    expect(el.textContent).toBe('Hello world');
  });

  it('appends child elements when children is an array', () => {
    const child1 = createElement('span', {}, 'A');
    const child2 = createElement('span', {}, 'B');
    const parent = createElement('div', {}, [child1, child2]);
    expect(parent.children.length).toBe(2);
    expect(parent.children[0].textContent).toBe('A');
  });

  it('ignores null/undefined children in array', () => {
    const child = createElement('span', {}, 'ok');
    const parent = createElement('div', {}, [null, child, undefined]);
    expect(parent.children.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// clearElement
// ---------------------------------------------------------------------------

describe('clearElement', () => {
  it('removes all child nodes', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span>a</span><span>b</span>';
    clearElement(el);
    expect(el.children.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// showView
// ---------------------------------------------------------------------------

describe('showView', () => {
  it('adds active class to the target view', () => {
    showView('home');
    const homeEl = document.querySelector('[data-view="home"]');
    expect(homeEl.classList.contains('active')).toBe(true);
  });

  it('removes active class from all other views', () => {
    const formEl = document.querySelector('[data-view="project-form"]');
    formEl.classList.add('active');
    showView('home');
    expect(formEl.classList.contains('active')).toBe(false);
  });

  it('only one view is active at a time', () => {
    showView('project-dashboard');
    const activeViews = $$('.view.active');
    expect(activeViews.length).toBe(1);
    expect(activeViews[0].getAttribute('data-view')).toBe('project-dashboard');
  });
});

// ---------------------------------------------------------------------------
// showToast
// ---------------------------------------------------------------------------

describe('showToast', () => {
  it('creates a toast element in #toast-container', () => {
    vi.useFakeTimers();
    showToast('Test message');
    const container = document.getElementById('toast-container');
    expect(container.children.length).toBe(1);
    expect(container.children[0].textContent).toBe('Test message');
    vi.runAllTimers();
  });

  it('applies the correct class for success type', () => {
    vi.useFakeTimers();
    showToast('Success!', 'success');
    const toast = document.getElementById('toast-container').children[0];
    expect(toast.classList.contains('toast')).toBe(true);
    expect(toast.classList.contains('success')).toBe(true);
    vi.runAllTimers();
  });

  it('applies the correct class for error type', () => {
    vi.useFakeTimers();
    showToast('Error!', 'error');
    const toast = document.getElementById('toast-container').children[0];
    expect(toast.classList.contains('error')).toBe(true);
    vi.runAllTimers();
  });

  it('removes the toast after 3 seconds', () => {
    vi.useFakeTimers();
    showToast('Bye soon');
    const container = document.getElementById('toast-container');
    expect(container.children.length).toBe(1);
    vi.advanceTimersByTime(3100);
    expect(container.children.length).toBe(0);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  it('returns a human-readable date string', () => {
    const result = formatDate('2026-03-17T14:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the year in the output', () => {
    const result = formatDate('2026-03-17T14:30:00.000Z');
    expect(result).toContain('2026');
  });

  it('returns a fallback for invalid input', () => {
    const result = formatDate('not-a-date');
    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// vibrate
// ---------------------------------------------------------------------------

describe('vibrate', () => {
  it('calls navigator.vibrate when available', () => {
    const mockVibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      configurable: true,
    });
    vibrate(100);
    expect(mockVibrate).toHaveBeenCalledWith(100);
  });

  it('does not throw when navigator.vibrate is unavailable', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
    });
    expect(() => vibrate(50)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// confirmDialog
// ---------------------------------------------------------------------------

describe('confirmDialog', () => {
  it('resolves true when window.confirm returns true', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = await confirmDialog('Are you sure?');
    expect(result).toBe(true);
  });

  it('resolves false when window.confirm returns false', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const result = await confirmDialog('Are you sure?');
    expect(result).toBe(false);
  });
});
