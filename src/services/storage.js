/**
 * Thin wrapper around localStorage / sessionStorage.
 * This is the only file in the app that reads or writes web storage, and every
 * call is guarded so private mode or a full quota can never crash the UI.
 */

function getStore(session) {
  try {
    return session ? window.sessionStorage : window.localStorage;
  } catch (error) {
    return null;
  }
}

export function get(key, fallback = null, { session = false } = {}) {
  const store = getStore(session);
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export function set(key, value, { session = false } = {}) {
  const store = getStore(session);
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Storage unavailable or full - keep the app running.
  }
}

export function remove(key, { session = false } = {}) {
  const store = getStore(session);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch (error) {
    // Ignore: nothing left to remove.
  }
}
