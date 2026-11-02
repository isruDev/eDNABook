/** @typedef {'waiting'|'locking'|'locked'|'error'} GpsState */
/** @typedef {{ latitude: number|null, longitude: number|null, accuracy: number|null, state: GpsState }} GpsStatus */

/** @type {number|null} */
let watchId = null;

/** @type {GpsStatus} */
let currentStatus = { latitude: null, longitude: null, accuracy: null, state: 'waiting' };

/** @type {Set<(status: GpsStatus) => void>} */
const listeners = new Set();

/**
 * Horizontal accuracy (meters) at or below which a fix counts as locked.
 * Worse accuracy shows the yellow "locking" warning pill.
 *
 * @type {number}
 */
export const GPS_LOCK_THRESHOLD_M = 15;

/**
 * Horizontal accuracy (meters) above which the fix is so coarse that the
 * device is most likely using network location instead of GNSS (for example
 * iOS "Precise Location" or Android location accuracy turned off).
 *
 * @type {number}
 */
export const GPS_COARSE_THRESHOLD_M = 1000;

/**
 * Computes the GPS state from an accuracy value.
 *
 * @param {number} accuracy - GPS accuracy in meters.
 * @returns {'locking'|'locked'} The computed state.
 */
function stateFromAccuracy(accuracy) {
  return accuracy <= GPS_LOCK_THRESHOLD_M ? 'locked' : 'locking';
}

/**
 * Notifies all registered listeners with the current GPS status.
 *
 * @returns {void}
 */
function notifyListeners() {
  const snapshot = { ...currentStatus };
  listeners.forEach((fn) => fn(snapshot));
}

/**
 * Starts the GPS watch. Called once at app startup.
 * If already running, this is a no-op.
 *
 * @returns {void}
 */
export function startGpsWatch() {
  if (watchId !== null) return;

  if (!navigator.geolocation) {
    currentStatus = { latitude: null, longitude: null, accuracy: null, state: 'error' };
    notifyListeners();
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      currentStatus = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        state: stateFromAccuracy(position.coords.accuracy),
      };
      notifyListeners();
    },
    (_error) => {
      currentStatus = { latitude: null, longitude: null, accuracy: null, state: 'error' };
      notifyListeners();
    },
    { enableHighAccuracy: true, maximumAge: 0 }
  );
}

/**
 * Discards the current fix and starts a fresh GPS watch, keeping listeners.
 * Listeners are notified of the reset ('waiting') and then of each new fix.
 *
 * @returns {void}
 * @remarks Used by the "Retake GPS" button. Unlike stopGpsWatch, this does not
 * clear listeners, so the GPS pill and entry form keep updating.
 */
export function restartGpsWatch() {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
  currentStatus = { latitude: null, longitude: null, accuracy: null, state: 'waiting' };
  notifyListeners();
  startGpsWatch();
}

/**
 * Stops the GPS watch and resets state.
 *
 * @returns {void}
 */
export function stopGpsWatch() {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
  currentStatus = { latitude: null, longitude: null, accuracy: null, state: 'waiting' };
  listeners.clear();
}

/**
 * Returns the current GPS status snapshot.
 *
 * @returns {GpsStatus} Current GPS state including coordinates and accuracy.
 */
export function getGpsStatus() {
  return { ...currentStatus };
}

/**
 * Returns the current cached position, or null if no fix yet.
 * Backward-compatible replacement for the old async getCurrentPosition().
 *
 * @returns {{ latitude: number, longitude: number, accuracy: number }|null}
 */
export function getCurrentPosition() {
  if (currentStatus.latitude === null) return null;
  return {
    latitude: currentStatus.latitude,
    longitude: currentStatus.longitude,
    accuracy: currentStatus.accuracy,
  };
}

/**
 * Registers a callback that fires on every GPS status change.
 *
 * @param {(status: GpsStatus) => void} callback - Listener function.
 * @returns {() => void} Unsubscribe function.
 */
export function onGpsChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
