// Html5Qrcode loaded via <script> tag in index.html (UMD, sets window.Html5Qrcode)
// In test env, vitest alias provides it as an ESM import
let Html5Qrcode;
if (typeof window !== 'undefined' && window.Html5Qrcode) {
  Html5Qrcode = window.Html5Qrcode;
} else {
  const mod = await import('../lib/html5-qrcode.min.js');
  Html5Qrcode = mod.Html5Qrcode;
}

const SCANNING_STATE = 2;

/**
 * Initializes and starts QR code scanning.
 *
 * @param {string} containerId - ID of the HTML element where the camera feed will be rendered
 * @param {Function} onSuccess - Callback function called with decoded QR text; scanner auto-stops after decode
 * @param {Function} onError - Callback function called with error message if camera permission is denied
 * @returns {Object} The Html5Qrcode scanner instance
 * @throws {Error} Re-throws non-permission errors from scanner start operation
 * @remarks
 * Configures scanner with rear camera, 10 fps, and 250x250 QR box.
 * Stops scanner automatically after successful decode.
 * Camera permission errors are caught and passed to onError callback.
 * @example
 * const scanner = await startScanner(
 *   'qr-reader',
 *   (text) => console.log('Decoded:', text),
 *   (err) => console.error('Camera error:', err)
 * );
 */
export async function startScanner(containerId, onSuccess, onError) {
  const scanner = new Html5Qrcode(containerId);

  const handleSuccess = async (decodedText) => {
    onSuccess(decodedText);
    await stopScanner(scanner);
  };

  const handleError = (errorMessage) => {
    // Ignore frame read errors; only process real decode failures
  };

  const cameraConfig = { facingMode: 'environment' };
  const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

  try {
    await scanner.start(cameraConfig, qrConfig, handleSuccess, handleError);
  } catch (error) {
    const errorMsg = error.message ? error.message.toLowerCase() : '';
    if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
      onError('Camera permission denied. Please enable camera access in your browser settings.');
    } else {
      throw error;
    }
  }

  return scanner;
}

/**
 * Stops and clears a QR scanner instance.
 *
 * @param {Object|null} scanner - The Html5Qrcode scanner instance to stop
 * @returns {Promise<void>} Resolves when scanner is stopped and cleared
 * @remarks
 * Safe to call on already-stopped or null scanners; no errors are thrown.
 * Silently ignores errors from stop operation in case scanner is not actively scanning.
 * @example
 * await stopScanner(scanner);
 */
export async function stopScanner(scanner) {
  if (!scanner) {
    return;
  }

  try {
    await scanner.stop();
  } catch {
    // Silently ignore stop errors (scanner may not be running)
  }

  try {
    await scanner.clear();
  } catch {
    // Silently ignore clear errors
  }
}

/**
 * Checks if a scanner instance is currently scanning.
 *
 * @param {Object|null} scanner - The Html5Qrcode scanner instance to check
 * @returns {boolean} True if scanner state is SCANNING (state 2), false otherwise
 * @remarks
 * State values: 1 = NOT_STARTED, 2 = SCANNING. Returns false for null scanner.
 * @example
 * if (isScanning(scanner)) {
 *   console.log('QR code scanning is active');
 * }
 */
export function isScanning(scanner) {
  if (!scanner) {
    return false;
  }

  return scanner.getState() === SCANNING_STATE;
}
