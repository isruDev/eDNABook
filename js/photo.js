import { sanitizeFilename } from './util.js';

/**
 * Triggers the device camera to capture a photo and returns a File
 * named with the sanitized project name and sample ID.
 *
 * @param {string} projectName - The project title (will be sanitized).
 * @param {string} sampleId - The sample identifier.
 * @returns {Promise<File|null>} The captured photo File, or null if cancelled.
 */
export function capturePhoto(projectName, sampleId) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        resolve(null);
        return;
      }

      const original = input.files[0];
      const filename = `${sanitizeFilename(projectName)}_${sampleId}.jpg`;
      const renamed = new File([original], filename, { type: original.type });
      resolve(renamed);
    };

    input.click();
  });
}

/**
 * Saves a photo file to the device using Web Share API or download fallback.
 *
 * @param {File} file - The photo file to save.
 * @returns {Promise<void>}
 */
export async function savePhotoToDevice(file) {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      throw err;
    }
    return;
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
