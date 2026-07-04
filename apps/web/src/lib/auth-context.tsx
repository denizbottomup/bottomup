'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  /** Firebase ID token cached for API calls. Refreshed automatically. */
  getIdToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value: AuthState = {
    user,
    loading,
    getIdToken: async () => {
      if (!user) return null;
      try {
        // Firebase's token refresh can stall silently in long-lived
        // tabs — an unbounded await here froze the Foxy submit with no
        // network request ever leaving the browser. Bound it; callers
        // treat null as "session broken, reload the page".
        return await Promise.race([
          user.getIdToken(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
      } catch {
        return null;
      }
    },
    signOut: async () => {
      await fbSignOut(getFirebaseAuth());
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
