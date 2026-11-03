"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LocalAuthProvider = void 0;
var _sha = require("./sha256.cjs");
var _storage = require("./storage.cjs");
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;
const nowMs = () => Date.now();
const randHex = n => Array.from({
  length: n
}, () => Math.floor(Math.random() * 16).toString(16)).join('');
const normalizeEmail = e => String(e || '').trim().toLowerCase();
const toPublicUser = record => {
  if (!record) return null;
  const {
    passwordHash,
    salt,
    reset,
    ...user
  } = record;
  return user;
};
async function loadUsers() {
  const users = await _storage.storage.get(_storage.KEYS.users);
  return Array.isArray(users) ? users : [];
}
async function saveUsers(users) {
  await _storage.storage.set(_storage.KEYS.users, users);
}
function isValidSession(session) {
  return !!(session && typeof session === 'object' && typeof session.token === 'string' && session.token.length > 8 && typeof session.userId === 'string' && typeof session.expiresAt === 'number' && Number.isFinite(session.expiresAt) && session.expiresAt > nowMs() && session.expiresAt < session.createdAt + 2 * SESSION_TTL_MS);
}
async function findUserByEmail(users, email) {
  return users.find(u => u.email === normalizeEmail(email)) || null;
}
const LocalAuthProvider = exports.LocalAuthProvider = {
  name: 'local',
  async signUp({
    email,
    password,
    profile
  }) {
    const norm = normalizeEmail(email);
    const users = await loadUsers();
    if (await findUserByEmail(users, norm)) {
      return {
        error: 'An account already exists with this email. Sign in instead or recover your password.'
      };
    }
    const salt = randHex(16);
    const userId = 'usr_' + randHex(12);
    const record = {
      id: userId,
      email: norm,
      salt,
      passwordHash: (0, _sha.sha256Hex)(salt + password),
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      country: profile.country || 'ZM',
      currency: profile.currency || 'ZMW',
      birthday: profile.birthday || null,
      createdAt: nowMs(),
      verified: false
    };
    users.push(record);
    await saveUsers(users);
    return {
      user: toPublicUser(record),
      needsVerification: true
    };
  },
  async signIn({
    email,
    password
  }) {
    const users = await loadUsers();
    const record = await findUserByEmail(users, email);
    if (!record) {
      return {
        error: 'No account found for that email. Create one or check the spelling.'
      };
    }
    const attempts = (await _storage.storage.get('@tuyamika/loginAttempts:' + record.email)) || {
      count: 0,
      until: 0
    };
    if (attempts.until > nowMs()) {
      return {
        error: 'Too many failed attempts. Try again in a minute.'
      };
    }
    const candidate = (0, _sha.sha256Hex)(record.salt + password);
    if (candidate !== record.passwordHash) {
      const count = attempts.count + 1;
      if (count >= MAX_ATTEMPTS) {
        await _storage.storage.set('@tuyamika/loginAttempts:' + record.email, {
          count: 0,
          until: nowMs() + LOCKOUT_MS
        });
        return {
          error: 'Too many failed attempts. Try again in a minute.'
        };
      }
      await _storage.storage.set('@tuyamika/loginAttempts:' + record.email, {
        count,
        until: 0
      });
      return {
        error: `Wrong password. You have ${MAX_ATTEMPTS - count} attempts left.`
      };
    }
    await _storage.storage.remove('@tuyamika/loginAttempts:' + record.email);
    const session = {
      token: randHex(24),
      userId: record.id,
      createdAt: nowMs(),
      expiresAt: nowMs() + SESSION_TTL_MS
    };
    await _storage.storage.set(_storage.KEYS.session, session);
    return {
      user: toPublicUser(record),
      session
    };
  },
  async getSession() {
    const session = await _storage.storage.get(_storage.KEYS.session);
    if (!isValidSession(session)) {
      if (session) await _storage.storage.remove(_storage.KEYS.session);
      return null;
    }
    const users = await loadUsers();
    const record = users.find(u => u.id === session.userId);
    if (!record) {
      await _storage.storage.remove(_storage.KEYS.session);
      return null;
    }
    return {
      session,
      user: toPublicUser(record)
    };
  },
  async signOut() {
    await _storage.storage.remove(_storage.KEYS.session);
    return {
      ok: true
    };
  },
  async updateProfile(userId, patch) {
    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return {
      error: 'Account not found.'
    };
    const allowed = {};
    for (const key of ['fullName', 'phone', 'birthday', 'currency', 'country', 'giftPreferences']) {
      if (key in patch) allowed[key] = patch[key];
    }
    users[idx] = {
      ...users[idx],
      ...allowed
    };
    await saveUsers(users);
    return {
      user: toPublicUser(users[idx])
    };
  },
  async verifyEmail(userId, code) {
    const users = await loadUsers();
    const record = users.find(u => u.id === userId);
    if (!record) return {
      error: 'Account not found.'
    };
    const expected = await _storage.storage.get('@tuyamika/verify:' + record.email);
    if (!expected || expected.code !== String(code).trim()) {
      return {
        error: 'That code is wrong or expired. Request a new one.'
      };
    }
    if (expected.until < nowMs()) {
      return {
        error: 'That code expired. Request a new one.'
      };
    }
    record.verified = true;
    await saveUsers(users);
    await _storage.storage.remove('@tuyamika/verify:' + record.email);
    return {
      user: toPublicUser(record)
    };
  },
  async requestPasswordReset(email) {
    const users = await loadUsers();
    const record = await findUserByEmail(users, email);
    if (!record) {
      return {
        ok: true,
        note: 'If an account exists for that email, a reset code is on its way.'
      };
    }
    const reset = {
      code: String(100000 + Math.floor(Math.random() * 900000)),
      until: nowMs() + RESET_TTL_MS
    };
    record.reset = reset;
    await saveUsers(users);
    return {
      ok: true,
      devCode: reset.code,
      note: 'Reset code issued.'
    };
  },
  async resetPassword({
    email,
    code,
    password
  }) {
    const users = await loadUsers();
    const record = await findUserByEmail(users, email);
    if (!record || !record.reset) {
      return {
        error: 'Request a reset code first.'
      };
    }
    if (record.reset.until < nowMs()) {
      return {
        error: 'That code expired. Request a new one.'
      };
    }
    if (record.reset.code !== String(code).trim()) {
      return {
        error: 'That code is wrong. Check it and try again.'
      };
    }
    const salt = randHex(16);
    record.salt = salt;
    record.passwordHash = (0, _sha.sha256Hex)(salt + password);
    record.reset = null;
    await saveUsers(users);
    return {
      ok: true
    };
  }
};
