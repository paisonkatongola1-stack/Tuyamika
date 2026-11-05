import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createAuthClient } from './authClient.js';

const AuthCtx = createContext(null);
export const authClient = createAuthClient();

export function AuthProvider({ children, client = authClient }) {
  const [state, setState] = useState({
    loading: true,
    loadError: null,
    session: null,
    user: null,
    guest: false,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      setState((current) => ({ ...current, loading: true, loadError: null }));
      try {
        const result = await client.getSession();
        if (active) {
          setState({
            loading: false,
            loadError: null,
            session: result?.session || null,
            user: result?.user || null,
            guest: false,
          });
        }
      } catch {
        if (active) {
          setState({
            loading: false,
            loadError: 'We could not restore your session. Check your connection and try again.',
            session: null,
            user: null,
            guest: false,
          });
        }
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [client, reloadKey]);

  const reloadSession = useCallback(() => setReloadKey((key) => key + 1), []);

  const actions = useMemo(
    () => ({
      async signUp(payload) {
        const result = await client.signUp(payload);
        if (result.error) return result;
        if (result.user && result.session) {
          setState({ loading: false, loadError: null, session: result.session, user: result.user, guest: false });
        }
        return result;
      },
      async signIn(payload) {
        const result = await client.signIn(payload);
        if (result.error) return result;
        setState({ loading: false, loadError: null, session: result.session, user: result.user, guest: false });
        return result;
      },
      async signOut() {
        const result = await client.signOut();
        if (result.error) return result;
        setState({ loading: false, loadError: null, session: null, user: null, guest: false });
        return result;
      },
      async updateProfile(patch) {
        if (!state.user) return { error: 'Sign in to update your profile.' };
        const result = await client.updateProfile(state.user.id, patch);
        if (result.error) return result;
        setState((current) => ({ ...current, user: result.user }));
        return result;
      },
      async enterGuestMode() {
        setState({ loading: false, loadError: null, session: null, user: null, guest: true });
        return { ok: true };
      },
      async exitGuestMode() {
        setState({ loading: false, loadError: null, session: null, user: null, guest: false });
        return { ok: true };
      },
    }),
    [client, state.user]
  );

  const value = useMemo(
    () => ({
      ...state,
      authMode: client.name || 'custom',
      reloadSession,
      ...actions,
    }),
    [actions, client.name, reloadSession, state]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const context = useContext(AuthCtx);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
