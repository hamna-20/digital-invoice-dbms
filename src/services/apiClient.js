import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';
import { get } from './storage';

function readSession() {
  return get(STORAGE_KEYS.SESSION) || get(STORAGE_KEYS.SESSION, null, { session: true });
}

/** Calls a JSON API endpoint using the current authenticated session. */
export async function requestApi(path, { method = 'GET', body } = {}) {
  const session = readSession();
  if (!session?.token) {
    const error = new Error('Your session has expired. Please sign in again.');
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