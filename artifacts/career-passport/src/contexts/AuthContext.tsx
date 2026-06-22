import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { getUser, getToken, setToken, setUser, removeToken, type User } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(getUser);
  const [token, setTokenState] = useState<string | null>(getToken);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setTokenState(newToken);
    setUserState(newUser);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUserState(null);
  }, []);

  // Refresh the current user (including their access role) from the server on
  // mount and then every 60 seconds while the session is active. This ensures
  // that admin-driven role changes (promote / demote) are reflected in the
  // frontend nav and route guards promptly — without a full re-login. The
  // backend already enforces the live role on every request, so security is
  // immediate; this polling closes the UI lag.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function refreshUser() {
      try {
        const res = await apiFetch("/auth/me");
        if (!res.ok) return;
        const fresh = (await res.json()) as User;
        if (cancelled) return;
        setUser(fresh);
        setUserState(fresh);
      } catch {
        /* ignore network/auth errors; apiFetch handles 401 redirects */
      }
    }

    refreshUser();
    const interval = setInterval(refreshUser, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
