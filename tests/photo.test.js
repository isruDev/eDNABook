import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { capturePhoto, savePhotoToDevice } from '../js/photo.js';

describe('capturePhoto', () => {
  let originalCreateElement;

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a File with sanitized project name and sample ID', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'input') {
        const input = { type: '', accept: '', capture: '', click: vi.fn(), onchange: null };
        input.click.mockImplementation(() => {
          const file = new File(['photo-data'], 'photo.jpg', { type: 'image/jpeg' });
          Object.defineProperty(input, 'files', { value: [file], configurable: true });
          if (input.onchange) input.onchange();
        });
        return input;
      }
      return originalCreateElement(tag);
    });

    const file = await capturePhoto('River Study #1', 'S-001');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('River_Study_1_S-001.jpg');
  });

  it('returns null when user cancels file selection', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'input') {
        const input = { type: '', accept: '', capture: '', click: vi.fn(), onchange: null };
        input.click.mockImplementation(() => {
          Object.defineProperty(input, 'files', { value: [], configurable: true });
          if (input.onchange) input.onchange();
        });
        return input;
      }
      return originalCreateElement(tag);
    });

    const file = await capturePhoto('Study', 'S-002');
    expect(file).toBeNull();
  });
});

describe('savePhotoToDevice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses navigator.share when canShare is available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      canShare: vi.fn().mockReturnValue(true),
      share: mockShare,
    });

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    await savePhotoToDevice(file);

    expect(mockShare).toHaveBeenCalledWith({ files: [file] });
  });

  it('falls back to anchor download when share unavailable', async () => {
    vi.stubGlobal('navigator', {});
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();

    const anchor = { href: '', download: '', click: vi.fn() };
    const originalCE = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return anchor;
      return originalCE(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    await savePhotoToDevice(file);

    expect(anchor.download).toBe('test.jpg');
    expect(anchor.click).toHaveBeenCalled();
  });

  it('handles AbortError from share gracefully', async () => {
    const abortError = new DOMException('User cancelled', 'AbortError');
    vi.stubGlobal('navigator', {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockRejectedValue(abortError),
    });

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    await expect(savePhotoToDevice(file)).resolves.toBeUndefined();
  });
});
