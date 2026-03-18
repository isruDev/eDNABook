/**
 * Selects the first element matching a CSS selector.
 *
 * @param {string} selector - A valid CSS selector string.
 * @returns {Element|null} The first matching element, or null if none found.
 */
export function $(selector) {
  return document.querySelector(selector);
}

/**
 * Selects all elements matching a CSS selector and returns them as an Array.
 *
 * @param {string} selector - A valid CSS selector string.
 * @returns {Element[]} Array of matching elements (empty if none found).
 */
export function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}

/**
 * Creates a DOM element with the given tag, attributes, and children.
 *
 * @param {string} tag - HTML tag name (e.g., 'div', 'button').
 * @param {Record<string, string>} attrs - Attribute key-value pairs. Use 'className' for class.
 * @param {string|Array<Element|null|undefined>} [children=''] - String sets textContent; array appends child elements (null/undefined entries are skipped).
 * @returns {HTMLElement} The constructed element.
 */
export function createElement(tag, attrs = {}, children = '') {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'textContent') {
      el.textContent = value;
    } else {
      el.setAttribute(key, value);
    }
  }
  if (typeof children === 'string') {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    for (const child of children) {
      if (child != null) {
        el.appendChild(child);
      }
    }
  }
  return el;
}

/**
 * Removes all child nodes from a DOM element.
 *
 * @param {Element} el - The element to clear.
 * @returns {void}
 */
export function clearElement(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Shows a named view by adding the 'active' class to it, and removes 'active'
 * from all other elements with the 'view' class.
 *
 * @param {string} viewName - The value of the target element's data-view attribute.
 * @returns {void}
 */
export function showView(viewName) {
  const views = $$('.view');
  for (const view of views) {
    view.classList.remove('active');
  }
  const target = $(`[data-view="${viewName}"]`);
  if (target) {
    target.classList.add('active');
  }
}

/**
 * Displays a temporary toast notification in #toast-container for 3 seconds.
 *
 * @param {string} message - The message text to display.
 * @param {'success'|'error'|'warning'} [type='success'] - Visual style of the toast.
 * @returns {void}
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = createElement('div', { className: `toast ${type}` }, message);
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode === container) {
      container.removeChild(toast);
    }
  }, 3000);
}

/**
 * Formats an ISO 8601 date string into a human-readable locale string.
 *
 * @param {string} isoString - An ISO 8601 date string.
 * @returns {string} Formatted date string (e.g., "Mar 17, 2026, 2:30 PM"), or
 *   "Invalid date" if the input cannot be parsed.
 */
export function formatDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Triggers a haptic vibration pattern if the device supports it.
 *
 * @param {number} [ms=50] - Duration of vibration in milliseconds.
 * @returns {void}
 */
export function vibrate(ms = 50) {
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

/**
 * Prompts the user for confirmation using the browser's native confirm dialog.
 *
 * Returns a Promise for interface consistency; can be upgraded to a custom modal
 * without changing call sites.
 *
 * @param {string} message - The confirmation message to display.
 * @returns {Promise<boolean>} Resolves to true if the user confirms, false otherwise.
 */
export function confirmDialog(message) {
  return Promise.resolve(window.confirm(message));
}
