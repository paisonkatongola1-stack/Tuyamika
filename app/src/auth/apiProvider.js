import { storage, KEYS } from './storage.js';
import { validateEmail, validatePassword } from './validate.js';
import { api, ApiError, isApiConfigured } from '../api/client.js';
import { googleSignIn } from './firebaseClient.js';

// Maps server userView (snake_case) onto the app's user shape (camelCase).
// birthday, currency, giftPreferences and onboardingComplete are device-local
// onboarding state; the server schema has no columns for them yet.
const LOCAL_ONLY_PROFILE_KEYS = ['fullName', 'birthday', 'currency', 'giftPreferences', 'onboardingComplete'];

async function loadLocalProfile() {
  return (await storage.get(KEYS.prefs)) || {};
}

function applyLocalProfile(user, profile) {
  return { ...DEFAULT_PROFILE, ...profile, ...filterUserView(user) };
}

function buildLocalOnlyUser(profile, userId) {
  return { ...DEFAULT_PROFILE, ...profile, id: userId };
}

async function saveLocalProfile(patch) {
  const profile = await loadLocalProfile();
  for (const key of LOCAL_ONLY_PROFILE_KEYS) {
    if (patch[key] !== undefined) profile[key] = patch[key];
  }
  await storage.set(KEYS.prefs, profile);
  return profile;
}

function filterUserView(user) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone || '',
    fullName: user.full_name || user.fullName || '',
    country: user.country || 'ZM',
    currency: user.currency || DEFAULT_PROFILE.currency,
    role: user.role,
    verified: !!user.verified,
  };
}

const DEFAULT_PROFILE = {
  fullName: '',
  birthday: '',
  currency: 'ZMW',
  giftPreferences: [],
  onboardingComplete: false,
};

function adaptSession(payload) {
  return {
    token: payload.token,
    userId: payload.user.id,
    createdAt: Date.now(),
    // The server issued a JWT; refresh with GET /me on next launch.
    expiresAt: null,
  };
}

async function persistSession(session) {
  if (session) await storage.set(KEYS.session, session);
  else await storage.remove(KEYS.session);
}

export const ApiAuthProvider = {
  name: 'tuyamika-api',

  async signUp({ email, password, profile } = {}) {
    const emailCheck = validateEmail(email);
    if (emailCheck.error) return { error: emailCheck.error };
    const passwordCheck = validatePassword(password);
    if (passwordCheck.error) return { error: passwordCheck.error };
    const fullName = profile?.fullName || '';

    let payload;
    try {
      payload = await api.post('/api/auth/signup', {
        email: emailCheck.email,
        password: passwordCheck.password,
        full_name: fullName || emailCheck.email.split('@')[0],
        country: profile?.country || 'ZM',
      });
    } catch (error) {
      return { error: describesConflict(error) ? 'An account already exists with this email. Sign in instead or recover your password.' : apiErrorMessage(error) };
    }

    const session = adaptSession(payload);
    await persistSession(session);
    await saveLocalProfile({ ...profile, fullName, currency: profile?.currency, onboardingComplete: false });
    return { user: applyLocalProfile(payload.user, await loadLocalProfile()), session };
  },

  async signIn({ email, password } = {}) {
    const emailCheck = validateEmail(email);
    if (emailCheck.error) return { error: emailCheck.error };
    if (typeof password !== 'string' || password.length === 0) {
      return { error: 'Enter your password to continue.' };
    }

    let payload;
    try {
      payload = await api.post('/api/auth/login', { email: emailCheck.email, password });
    } catch (error) {
      return { error: error.status === 401 ? 'Email or password is incorrect.' : apiErrorMessage(error) };
    }

    const session = adaptSession(payload);
    await persistSession(session);
    return { user: applyLocalProfile(payload.user, await loadLocalProfile()), session };
  },

  async signInWithGoogle() {
    const result = await googleSignIn();
    if (result.error) return result;

    let payload;
    try {
      payload = await api.post('/api/auth/firebase', { id_token: result.id_token });
    } catch (error) {
      if (error.status === 503) {
        return { error: 'Google sign in is not enabled on the Tuyamika server yet.' };
      }
      return { error: apiErrorMessage(error) };
    }

    const session = adaptSession(payload);
    await persistSession(session);
    return { user: applyLocalProfile(payload.user, await loadLocalProfile()), session };
  },

  async getSession() {
    const session = await storage.get(KEYS.session);
    if (!session || typeof session.token !== 'string') return null;

    try {
      const payload = await api.get('/api/auth/me', session.token);
      return { session, user: applyLocalProfile(payload.user, await loadLocalProfile()) };
    } catch {
      await persistSession(null);
      return null;
    }
  },

  async signOut() {
    await persistSession(null);
    return { ok: true };
  },

  async updateProfile(userId, patch) {
    const profilePatch = {};
    for (const key of ['fullName', 'phone', 'country', 'currency', 'birthday', 'giftPreferences', 'onboardingComplete']) {
      if (patch[key] !== undefined) profilePatch[key] = patch[key];
    }
    if (Object.keys(profilePatch).length === 0) return { user: null };
    await saveLocalProfile(profilePatch);

    const serverBody = {
      ...(profilePatch.fullName !== undefined ? { full_name: profilePatch.fullName } : {}),
      ...(profilePatch.phone !== undefined ? { phone: profilePatch.phone || undefined } : {}),
      ...(profilePatch.country !== undefined ? { country: profilePatch.country } : {}),
    };
    if (Object.keys(serverBody).length === 0) {
      // Only device-local fields changed (onboarding flow) — no server call.
      const profile = await loadLocalProfile();
      return { user: buildLocalOnlyUser(profile, userId) };
    }

    const session = await storage.get(KEYS.session);
    if (!session?.token) return { error: 'Sign in to update your profile.' };

    try {
      const payload = await api.patch('/api/auth/me', serverBody, session.token);
      return { user: applyLocalProfile(payload.user, await loadLocalProfile()) };
    } catch (error) {
      return { error: apiErrorMessage(error) };
    }
  },

  async requestPasswordReset() {
    return { error: 'Password recovery is coming soon. Contact hello@tuyamika.co.zm for account help.' };
  },

  async resetPassword() {
    return { error: 'Password recovery is coming soon. Contact hello@tuyamika.co.zm for account help.' };
  },
};

function describesConflict(error) {
  return error instanceof ApiError && error.status === 409;
}

function apiErrorMessage(error) {
  if (error instanceof ApiError && error.message) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}

// Any lifecycle UI checks (Welcome/Splash) gate the app on provider availability.
export const ApiAuthProviderGate = { configured: isApiConfigured() };
