/**
 * Requests the device's current GPS position using the Geolocation API.
 *
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number} | null>}
 *   Resolves with coordinate data on success, or null if geolocation is
 *   unavailable, permission is denied, or the request times out.
 * @remarks
 *   Uses high accuracy mode. Allows a cached position up to 60 seconds old
 *   to reduce time-to-first-fix in the field. Always resolves -- never rejects.
 * @example
 *   const pos = await getCurrentPosition();
 *   if (pos) console.log(pos.latitude, pos.longitude);
 */
export function getCurrentPosition() {
  if (!navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
