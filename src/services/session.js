/**
 * Session helpers shared by the API clients and the sign-in screen.
 *
 * When the backend rejects a token, the client clears the stored session and
 * leaves a one-time notice so the sign-in page can explain why the user was
 * sent back. The notice lives in sessionStorage and disappears once shown.
 */

import { STORAGE_KEYS } from '../config/constants';
import { get, remove, set } from './storage';

const NOTICE_OPTIONS = { session: true };

export function clearStoredSession() {
  remove(STORAGE_KEYS.SESSION);
  remove(STORAGE_KEYS.SESSION, { session: true });
}

/** Flags the next sign-in screen as reached because the session expired. */
export function markSessionExpired() {
  set(STORAGE_KEYS.SESSION_EXPIRED, true, NOTICE_OPTIONS);
}

/** Reads and clears the expired-session notice. */
export function consumeSessionExpired() {
  const expired = get(STORAGE_KEYS.SESSION_EXPIRED, false, NOTICE_OPTIONS);
  if (expired) remove(STORAGE_KEYS.SESSION_EXPIRED, NOTICE_OPTIONS);
  return Boolean(expired);
}

/** Clears the notice after a successful sign-in. */
export function clearSessionExpired() {
  remove(STORAGE_KEYS.SESSION_EXPIRED, NOTICE_OPTIONS);
}
