import { describe, it, expect, beforeEach, vi } from 'vitest';
import { startScanner, stopScanner, isScanning } from '../js/scanner.js';

// Mock Html5Qrcode before module is imported
const mockStart = vi.fn();
const mockStop = vi.fn().mockResolvedValue(undefined);
const mockClear = vi.fn().mockResolvedValue(undefined);
let mockIsScanning = false;

vi.mock('../lib/html5-qrcode.min.js', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
    clear: mockClear,
    getState: () => (mockIsScanning ? 2 : 1), // 2 = SCANNING, 1 = NOT_STARTED
  })),
}));

describe('startScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsScanning = false;
  });

  it('initializes Html5Qrcode with the given containerId', async () => {
    const { Html5Qrcode } = await import('../lib/html5-qrcode.min.js');
    mockStart.mockResolvedValueOnce(undefined);

    await startScanner('qr-reader', vi.fn(), vi.fn());

    expect(Html5Qrcode).toHaveBeenCalledWith('qr-reader');
  });

  it('starts scanning with correct config', async () => {
    mockStart.mockResolvedValueOnce(undefined);

    await startScanner('qr-reader', vi.fn(), vi.fn());

    expect(mockStart).toHaveBeenCalledWith(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('calls onSuccess and stops scanner on successful decode', async () => {
    const onSuccess = vi.fn();
    let capturedSuccessCallback;

    mockStart.mockImplementationOnce((_camera, _config, successCb) => {
      capturedSuccessCallback = successCb;
      return Promise.resolve();
    });
    mockStop.mockResolvedValueOnce(undefined);

    await startScanner('qr-reader', onSuccess, vi.fn());
    await capturedSuccessCallback('SAMPLE-001');

    expect(onSuccess).toHaveBeenCalledWith('SAMPLE-001');
    expect(mockStop).toHaveBeenCalled();
  });

  it('calls onError with descriptive message on camera permission denied', async () => {
    const onError = vi.fn();
    mockStart.mockRejectedValueOnce(new Error('Permission denied'));

    await startScanner('qr-reader', vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('camera')
    );
  });
});

describe('stopScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsScanning = true;
  });

  it('calls stop and clear on the scanner instance', async () => {
    const fakeScanner = {
      stop: mockStop,
      clear: mockClear,
      getState: () => 2,
    };

    await stopScanner(fakeScanner);

    expect(mockStop).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalled();
  });

  it('does not throw when scanner is already stopped', async () => {
    const fakeScanner = {
      stop: vi.fn().mockRejectedValueOnce(new Error('Scanner not running')),
      clear: mockClear,
      getState: () => 1,
    };

    await expect(stopScanner(fakeScanner)).resolves.not.toThrow();
  });

  it('does not throw when scanner is null', async () => {
    await expect(stopScanner(null)).resolves.not.toThrow();
  });
});

describe('isScanning', () => {
  it('returns true when scanner state is SCANNING (2)', () => {
    const fakeScanner = { getState: () => 2 };
    expect(isScanning(fakeScanner)).toBe(true);
  });

  it('returns false when scanner state is not SCANNING', () => {
    const fakeScanner = { getState: () => 1 };
    expect(isScanning(fakeScanner)).toBe(false);
  });

  it('returns false when scanner is null', () => {
    expect(isScanning(null)).toBe(false);
  });
});
