// tests/views/more-modal.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { openMoreModal, closeMoreModal } from '../../js/views/more-modal.js';

beforeEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
  vi.clearAllMocks();
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

  it('renders three menu items', () => {
    openMoreModal();
    const items = document.querySelectorAll('.more-modal-item');
    expect(items).toHaveLength(3);
  });

  it('menu item labels are Offline Access (iOS), Offline Access (Android), About eDNALite', () => {
    openMoreModal();
    const labels = Array.from(document.querySelectorAll('.more-modal-item')).map(el => el.textContent.trim());
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
