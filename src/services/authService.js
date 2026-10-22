/**
 * Accounts and sessions. Every function is async so this module can later call
 * a real backend without any component changing.
 */

import {
  DEMO_ACCOUNT_ENABLED,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_USER_ID,
  STORAGE_KEYS,
  dataStorageKey,
} from '../config/constants';
import { createSeedData, SEED_BUSINESS } from '../config/seed';
import { emailSchema, loginFormSchema, newAccountSchema, parseOrThrow } from '../lib/validators';
import { get, remove, set } from './storage';

/**
 * Placeholder only. In production passwords must be sent over HTTPS and hashed
 * on the server - never stored (or compared) in the browser.
 */
function hashPassword(password) {
  try {
    return `local:${window.btoa(String(password))}`;
  } catch (error) {
    return `local:${encodeURIComponent(String(password))}`;
  }
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

function readUsers() {
  const users = get(STORAGE_KEYS.USERS, []);
  return Array.isArray(users) ? users : [];
}

function writeUsers(users) {
  set(STORAGE_KEYS.USERS, users);
}

function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function readSession() {
  return get(STORAGE_KEYS.SESSION) || get(STORAGE_KEYS.SESSION, null, { session: true });
}

/** "Remember me" keeps the session in localStorage, otherwise sessionStorage. */
function writeSession(userId, remember) {
  remove(STORAGE_KEYS.SESSION);
  remove(STORAGE_KEYS.SESSION, { session: true });
  set(STORAGE_KEYS.SESSION, { userId, remember }, { session: !remember });
}

/** Creates the demo account and its seed data once, if the demo flag is on. */
function ensureDemoAccount() {
  if (!DEMO_ACCOUNT_ENABLED) return;
  const users = readUsers();
  if (users.some((user) => user.id === DEMO_USER_ID)) return;
  const demoUser = {
    id: DEMO_USER_ID,
    name: 'Ali Khan',
    business: SEED_BUSINESS.name,
    businessNtn: SEED_BUSINESS.ntn,
    businessAddress: SEED_BUSINESS.address,
    email: DEMO_EMAIL,
    passwordHash: hashPassword(DEMO_PASSWORD),
  };
  writeUsers([...users, demoUser]);
  set(dataStorageKey(DEMO_USER_ID), createSeedData());
}

export async function signup(payload) {
  ensureDemoAccount();
  const { name, email, password } = parseOrThrow(newAccountSchema, payload);
  const users = readUsers();
  const normalizedEmail = normalizeEmail(email);
  if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
    throw new Error('An account with this email already exists');
  }
  const user = {
    id: `u_${Date.now()}`,
    name,
    business: '',
    businessNtn: '',
    businessAddress: '',
    email: normalizedEmail,
    passwordHash: hashPassword(password),
  };
  writeUsers([...users, user]);
  writeSession(user.id, true);
  return toPublicUser(user);
}

export async function login(payload) {
  ensureDemoAccount();
  const { email, password, remember } = parseOrThrow(loginFormSchema, payload);
  const user = readUsers().find((item) => normalizeEmail(item.email) === normalizeEmail(email));
  if (!user || user.passwordHash !== hashPassword(password)) {
    throw new Error('Email or password is incorrect.');
  }
  writeSession(user.id, remember);
  return toPublicUser(user);
}

export async function logout() {
  remove(STORAGE_KEYS.SESSION);
  remove(STORAGE_KEYS.SESSION, { session: true });
}

export async function getCurrentUser() {
  const session = readSession();
  if (!session || !session.userId) return null;
  const user = readUsers().find((item) => item.id === session.userId);
  return user ? toPublicUser(user) : null;
}

/** Resolves even for unknown emails - the UI must never reveal if an account exists. */
export async function requestPasswordReset(email) {
  // Simulates the round trip to a reset endpoint; the response shape is identical
  // whether or not an account exists, by design.
  const { email: normalized } = parseOrThrow(emailSchema, { email });
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { requestedFor: normalized };
}
