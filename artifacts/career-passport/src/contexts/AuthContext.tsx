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

  // On load, refresh the current user (including their access role) from the
  // server so admin-driven role/manager changes take effect on the next load
  // for nav and route gating, even while a session is still active.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
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
    })();
    return () => {
      cancelled = true;
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
