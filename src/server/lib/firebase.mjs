// Firebase Authentication provider (optional). Activated when FIREBASE_* env vars are set.
// Scaffold-first design: without credentials every call fails with a clear 503 and
// AUTH_PROVIDER keeps defaulting to local email/password accounts.
const cached = { app: null, auth: null };

export function firebaseEnabled() {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export function firebaseConfigView() {
  return {
    enabled: firebaseEnabled(),
    project_id: process.env.FIREBASE_PROJECT_ID || null,
  };
}

export function firebaseAdminEmails() {
  return (process.env.FIREBASE_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes('@'));
}

const notConfigured = () => Object.assign(new Error('firebase auth not configured (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY missing)'), { status: 503 });

export async function verifyFirebaseIdToken(idToken) {
  if (!firebaseEnabled()) throw notConfigured();
  if (!cached.auth) {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    cached.app = getApps().length ? getApps()[0] : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    cached.auth = getAuth(cached.app);
  }
  return cached.auth.verifyIdToken(idToken, true);
}
