import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '@/api/auth';
import { setUnauthorizedHandler } from '@/api/client';
import type { RegisterInput, User } from '@/types';

/**
 * Client-side auth state. The role in `user` is only used to decide what to SHOW.
 * The Express API must authorize every request from the JWT, never from this object.
 * The access token is NOT exposed here; it lives in api/tokenStore.ts.
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** True until the first session-restore attempt finishes. */
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi
      .restore()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    // A failed token refresh anywhere in the app logs the user out.
    setUnauthorizedHandler(() => setUser(null));
    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    setUser(await authApi.login(phone, password));
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setUser(await authApi.register(input));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null); // DataContext clears every private slice when user becomes null
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
