/**
 * Authentication API client. Business data remains local until its API is
 * connected separately.
 */

import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';
import { emailSchema, loginFormSchema, newAccountSchema, parseOrThrow } from '../lib/validators';
import { get, remove, set } from './storage';

function toAppUser(user) {
  if (!user || user.id === undefined || !user.email) {
    throw new Error('The authentication server returned an invalid user.');
  }
  return {
    id: user.id,
    name: user.fullName || user.name || user.email,
    business: user.business || '',
    businessNtn: user.businessNtn || '',
    businessAddress: user.businessAddress || '',
    email: user.email,
  };
}

function readSession() {
  return get(STORAGE_KEYS.SESSION) || get(STORAGE_KEYS.SESSION, null, { session: true });
}

function writeSession(token, user, remember) {
  remove(STORAGE_KEYS.SESSION);
  remove(STORAGE_KEYS.SESSION, { session: true });
  set(STORAGE_KEYS.SESSION, { token, user }, { session: !remember });
}

async function requestAuth(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Unable to connect to the authentication server at ${API_BASE_URL}. Make sure the backend is running.`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The authentication server returned an invalid response.');
  }

  if (!result || typeof result !== 'object') {
    throw new Error('The authentication server returned an invalid response.');
  }

  if (!response.ok) {
    const validationMessage = Array.isArray(result.errors)
      ? result.errors[0]?.message
      : undefined;
    const error = new Error(validationMessage || result.message || 'Authentication request failed.');
    error.status = response.status;
    throw error;
  }

  if (!result.success || !result.data) {
    throw new Error('The authentication server returned an invalid response.');
  }
  return result.data;
}

export async function signup(payload) {
  const { name, email, password } = parseOrThrow(newAccountSchema, payload);
  await requestAuth('signup', {
    method: 'POST',
    body: { fullName: name, email, password, confirmPassword: password },
  });
  return login({ email, password, remember: true });
}

export async function login(payload) {
  const { email, password, remember } = parseOrThrow(loginFormSchema, payload);
  const result = await requestAuth('signin', {
    method: 'POST',
    body: { email, password },
  });
  if (!result.token || !result.user) {
    throw new Error('The authentication server returned an invalid sign-in response.');
  }
  const user = toAppUser(result.user);
  writeSession(result.token, user, remember);
  return user;
}

export async function logout() {
  remove(STORAGE_KEYS.SESSION);
  remove(STORAGE_KEYS.SESSION, { session: true });
}

export async function getCurrentUser() {
  const session = readSession();
  if (!session?.token || !session.user) {
    if (session) {
      remove(STORAGE_KEYS.SESSION);
      remove(STORAGE_KEYS.SESSION, { session: true });
    }
    return null;
  }

  try {
    const result = await requestAuth('me', { token: session.token });
    if (
      !result.user ||
      typeof result.user.email !== 'string' ||
      typeof session.user.email !== 'string' ||
      String(result.user.id) !== String(session.user.id) ||
      result.user.email.toLowerCase() !== session.user.email.toLowerCase()
    ) {
      throw new Error('The authentication server returned a mismatched user session.');
    }
    return toAppUser({ ...session.user, ...result.user, fullName: session.user.name });
  } catch (error) {
    if (error.status === 401) {
      await logout();
      return null;
    }
    throw error;
  }
}

/** Resolves even for unknown emails - the UI must never reveal if an account exists. */
export async function requestPasswordReset(email) {
  // Simulates the round trip to a reset endpoint; the response shape is identical
  // whether or not an account exists, by design.
  const { email: normalized } = parseOrThrow(emailSchema, { email });
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { requestedFor: normalized };
}
