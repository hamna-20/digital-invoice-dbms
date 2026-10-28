import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, requestPasswordReset as resetRequest, signup as signupRequest } from '../services/authService';

export const AuthContext = createContext(null);

/** Owns the signed-in user and exposes the async auth actions used by pages. */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus(currentUser ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (active) setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const signedInUser = await loginRequest(credentials);
    setUser(signedInUser);
    setStatus('authenticated');
    return signedInUser;
  }, []);

  const signup = useCallback(async (details) => {
    await signupRequest(details);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    await resetRequest(email);
  }, []);

  const value = useMemo(
    () => ({ user, status, login, signup, logout, requestPasswordReset }),
    [user, status, login, signup, logout, requestPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
