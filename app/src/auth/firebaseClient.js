import { Platform } from 'react-native';

// Optional Google sign in for web deployments of the Expo app.
// Reads the same Firebase *web app* config described in ../.env.example.
// Native platforms route through Google's native SDKs in a later milestone;
// for now they hide the Google button.
const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const googleSignInSupported = Platform.OS === 'web';

export function isFirebaseAppConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
}

export async function googleSignIn() {
  if (!googleSignInSupported) {
    return { error: 'Google sign in is currently available on the web app only.' };
  }
  if (!isFirebaseAppConfigured()) {
    return { error: 'Google sign in is not configured in this build.' };
  }

  let app;
  let auth;
  try {
    const appMod = await import('firebase/app');
    const authMod = await import('firebase/auth');
    app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(FIREBASE_CONFIG);
    auth = authMod.getAuth(app);
    const provider = new authMod.GoogleAuthProvider();
    authMod.useDeviceLanguage(auth);
    const result = await authMod.signInWithPopup(auth, provider);
    const idToken = await authMod.getIdToken(result.user, false);
    return { id_token: idToken };
  } catch {
    // authPromiseRejectionIsStandard: popup blocked / closed, network errors, etc.
    return { error: 'Google sign in was interrupted. Try again or use your password.' };
  }
}
