import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';
import { clearStoredSession, markSessionExpired } from './session';
import { get } from './storage';

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

let redirectingToLogin = false;

function readSession() {
  return get(STORAGE_KEYS.SESSION) || get(STORAGE_KEYS.SESSION, null, { session: true });
}

/**
 * Ends the local session and sends the browser straight to the sign-in screen.
 * A full navigation is intentional: it stops any in-flight requests and clears
 * half-rendered data before the user signs in again.
 */
function expireSession() {
  markSessionExpired();
  clearStoredSession();
  if (redirectingToLogin) return;
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    redirectingToLogin = true;
    window.location.replace('/login');
  }
}

/** Calls a JSON API endpoint using the current authenticated session. */
export async function requestApi(path, { method = 'GET', body } = {}) {
  const session = readSession();
  if (!session?.token) {
    expireSession();
    const error = new Error(SESSION_EXPIRED_MESSAGE);
    error.status = 401;
    throw error;
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${session.token}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`Unable to connect to the backend at ${API_BASE_URL}. Make sure the backend is running.`);
  }

  if (response.status === 204) return null;

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The backend returned an invalid response.');
  }

  if (!result || typeof result !== 'object') {
    throw new Error('The backend returned an invalid response.');
  }
  if (!response.ok) {
    if (response.status === 401) {
      expireSession();
      const error = new Error(SESSION_EXPIRED_MESSAGE);
      error.status = 401;
      throw error;
    }
    const validationMessage = Array.isArray(result.errors) ? result.errors[0]?.message : undefined;
    const error = new Error(validationMessage || result.message || 'The backend request failed.');
    error.status = response.status;
    throw error;
  }
  if (!result.success || !result.data) {
    throw new Error('The backend returned an invalid response.');
  }

  return result.data;
}
