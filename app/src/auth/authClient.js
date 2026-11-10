import * as Crypto from 'expo-crypto';
import { sha256Hex } from './sha256.js';
import { storage, KEYS } from './storage.js';
import { validateEmail, validatePassword } from './validate.js';
import { ApiAuthProvider } from './apiProvider.js';
import { isApiConfigured } from '../api/client.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

const nowMs = () => Date.now();
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

async function randomHex(byteLength) {
  const bytes = await Crypto.getRandomBytesAsync(byteLength);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function randomResetCode() {
  const bytes = await Crypto.getRandomBytesAsync(4);
  const value = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  return String(100000 + (value % 900000));
}

const toPublicUser = (record) => {
  if (!record) return null;
  const { passwordHash, salt, reset, ...user } = record;
  return user;
};

async function loadUsers() {
  const users = await storage.get(KEYS.users);
  return Array.isArray(users) ? users : [];
}

async function saveUsers(users) {
  await storage.set(KEYS.users, users);
}

function isValidSession(session) {
  return !!(
    session &&
    typeof session === 'object' &&
    typeof session.token === 'string' &&
    session.token.length >= 64 &&
    typeof session.userId === 'string' &&
    typeof session.createdAt === 'number' &&
    Number.isFinite(session.createdAt) &&
    session.createdAt <= nowMs() &&
    typeof session.expiresAt === 'number' &&
    Number.isFinite(session.expiresAt) &&
    session.expiresAt > nowMs() &&
    session.expiresAt <= session.createdAt + SESSION_TTL_MS
  );
}

async function findUserByEmail(users, email) {
  return users.find((user) => user.email === normalizeEmail(email)) || null;
}

async function createSession(userId) {
  const createdAt = nowMs();
  return {
    token: await randomHex(32),
    userId,
    createdAt,
    expiresAt: createdAt + SESSION_TTL_MS,
  };
}

export function createAuthClient() {
  return getDefaultAuthProvider();
}

export function getDefaultAuthProvider() {
  if (isApiConfigured()) return ApiAuthProvider;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return LocalAuthProvider;
  return UnconfiguredAuthProvider;
}

export { googleSignInSupported, isFirebaseAppConfigured } from './firebaseClient.js';

export const UnconfiguredAuthProvider = {
  name: 'unconfigured',

  async getSession() {
    return null;
  },

  async signUp() {
    return { error: 'Account services are not configured. Connect a Supabase or Firebase provider before release.' };
  },

  async signIn() {
    return { error: 'Account services are not configured. Connect a Supabase or Firebase provider before release.' };
  },

  async signOut() {
    return { ok: true };
  },

  async updateProfile() {
    return { error: 'Account services are not configured. Connect a Supabase or Firebase provider before release.' };
  },

  async requestPasswordReset() {
    return { error: 'Account services are not configured. Connect a Supabase or Firebase provider before release.' };
  },

  async resetPassword() {
    return { error: 'Account services are not configured. Connect a Supabase or Firebase provider before release.' };
  },
};

export const LocalAuthProvider = {
  name: 'local-development',

  async signUp({ email, password }) {
    const emailCheck = validateEmail(email);
    if (emailCheck.error) return { error: emailCheck.error };
    const passwordCheck = validatePassword(password);
    if (passwordCheck.error) return { error: passwordCheck.error };

    const users = await loadUsers();
    if (await findUserByEmail(users, emailCheck.email)) {
      return { error: 'An account already exists with this email. Sign in instead or recover your password.' };
    }

    const [salt, id] = await Promise.all([randomHex(16), randomHex(12)]);
    const record = {
      id: `usr_${id}`,
      email: emailCheck.email,
      salt,
      passwordHash: sha256Hex(salt + passwordCheck.password),
      fullName: '',
      phone: '',
      country: 'ZM',
      currency: 'ZMW',
      birthday: null,
      giftPreferences: [],
      onboardingComplete: false,
      createdAt: nowMs(),
    };
    users.push(record);
    await saveUsers(users);

    const session = await createSession(record.id);
    await storage.set(KEYS.session, session);
    return { user: toPublicUser(record), session };
  },

  async signIn({ email, password }) {
    const emailCheck = validateEmail(email);
    if (emailCheck.error) return { error: emailCheck.error };
    if (typeof password !== 'string' || password.length === 0) {
      return { error: 'Enter your password to continue.' };
    }

    const users = await loadUsers();
    const record = await findUserByEmail(users, emailCheck.email);
    if (!record) return { error: 'Email or password is incorrect.' };

    const attemptsKey = `@tuyamika/loginAttempts:${record.email}`;
    const attempts = (await storage.get(attemptsKey)) || { count: 0, until: 0 };
    if (attempts.until > nowMs()) {
      return { error: 'Too many failed attempts. Try again in a minute.' };
    }

    const candidate = sha256Hex(record.salt + password);
    if (candidate !== record.passwordHash) {
      const count = attempts.count + 1;
      if (count >= MAX_ATTEMPTS) {
        await storage.set(attemptsKey, { count: 0, until: nowMs() + LOCKOUT_MS });
        return { error: 'Too many failed attempts. Try again in a minute.' };
      }
      await storage.set(attemptsKey, { count, until: 0 });
      return { error: `Email or password is incorrect. ${MAX_ATTEMPTS - count} attempts remain.` };
    }

    await storage.remove(attemptsKey);
    const session = await createSession(record.id);
    await storage.set(KEYS.session, session);
    return { user: toPublicUser(record), session };
  },

  async getSession() {
    const session = await storage.get(KEYS.session);
    if (!isValidSession(session)) {
      if (session) await storage.remove(KEYS.session);
      return null;
    }

    const users = await loadUsers();
    const record = users.find((user) => user.id === session.userId);
    if (!record) {
      await storage.remove(KEYS.session);
      return null;
    }
    return { session, user: toPublicUser(record) };
  },

  async signOut() {
    await storage.remove(KEYS.session);
    return { ok: true };
  },

  async updateProfile(userId, patch) {
    const users = await loadUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index < 0) return { error: 'Account not found.' };

    const allowed = {};
    for (const key of ['fullName', 'phone', 'birthday', 'currency', 'country', 'giftPreferences', 'onboardingComplete']) {
      if (key in patch) allowed[key] = patch[key];
    }
    if (Array.isArray(allowed.giftPreferences)) {
      allowed.giftPreferences = [...new Set(allowed.giftPreferences.filter((item) => typeof item === 'string'))];
    }

    users[index] = { ...users[index], ...allowed };
    await saveUsers(users);
    return { user: toPublicUser(users[index]) };
  },

  async requestPasswordReset(email) {
    const emailCheck = validateEmail(email);
    if (emailCheck.error) return { error: emailCheck.error };

    const users = await loadUsers();
    const record = await findUserByEmail(users, emailCheck.email);
    if (!record) {
      return { ok: true, note: 'If an account exists for that email, a reset code is on its way.' };
    }

    const reset = {
      code: await randomResetCode(),
      until: nowMs() + RESET_TTL_MS,
      attempts: 0,
    };
    record.reset = reset;
    await saveUsers(users);
    return {
      ok: true,
      devCode: reset.code,
      note: 'Development-only reset code. No email was sent.',
    };
  },

  async resetPassword({ email, code, password }) {
    const emailCheck = validateEmail(email);
    if (emailCheck.error) return { error: emailCheck.error };
    const passwordCheck = validatePassword(password);
    if (passwordCheck.error) return { error: passwordCheck.error };

    const users = await loadUsers();
    const record = await findUserByEmail(users, emailCheck.email);
    if (!record || !record.reset) return { error: 'Request a reset code first.' };
    if (record.reset.until < nowMs()) return { error: 'That code expired. Request a new one.' };
    if (record.reset.attempts >= MAX_ATTEMPTS) {
      return { error: 'Too many incorrect codes. Request a new reset code.' };
    }
    if (record.reset.code !== String(code).trim()) {
      record.reset.attempts += 1;
      await saveUsers(users);
      return { error: 'That code is wrong. Check it and try again.' };
    }

    const salt = await randomHex(16);
    record.salt = salt;
    record.passwordHash = sha256Hex(salt + passwordCheck.password);
    record.reset = null;
    await saveUsers(users);
    await storage.remove(KEYS.session);
    return { ok: true };
  },
};
