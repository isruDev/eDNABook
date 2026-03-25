/** @typedef {'waiting'|'locking'|'locked'|'error'} GpsState */
/** @typedef {{ latitude: number|null, longitude: number|null, accuracy: number|null, state: GpsState }} GpsStatus */

/** @type {number|null} */
let watchId = null;

/** @type {GpsStatus} */
let currentStatus = { latitude: null, longitude: null, accuracy: null, state: 'waiting' };

/** @type {Set<(status: GpsStatus) => void>} */
const listeners = new Set();

/**
 * Computes the GPS state from an accuracy value.
 *
 * @param {number} accuracy - GPS accuracy in meters.
 * @returns {'locking'|'locked'} The computed state.
 */
function stateFromAccuracy(accuracy) {
  return accuracy <= 50 ? 'locked' : 'locking';
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
    { enableHighAccuracy: true }
  );
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
