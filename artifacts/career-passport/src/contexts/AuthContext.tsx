import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { getUser, getToken, setToken, setUser, removeToken, type User, type SubscriptionStatus } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  subscription: SubscriptionStatus | null;
  isSubscriptionLoaded: boolean;
  isTeamPlan: boolean;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(getUser);
  const [token, setTokenState] = useState<string | null>(getToken);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isSubscriptionLoaded, setIsSubscriptionLoaded] = useState(false);
  const prevRoleRef = useRef<string | null>(getUser()?.role ?? null);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setTokenState(newToken);
    setUserState(newUser);
    setSubscription(null);
    setIsSubscriptionLoaded(false);
    prevRoleRef.current = newUser.role;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUserState(null);
    setSubscription(null);
    setIsSubscriptionLoaded(true);
    prevRoleRef.current = null;
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!token) {
      setSubscription(null);
      setIsSubscriptionLoaded(true);
      return;
    }
    try {
      const res = await apiFetch("/stripe/subscription");
      if (!res.ok) {
        setIsSubscriptionLoaded(true);
        return;
      }
      const status = (await res.json()) as SubscriptionStatus;
      // Older subscriptions used "pro"; the UI uses the canonical
      // professional/team plan vocabulary.
      setSubscription({ ...status, plan: status.plan === "pro" ? "professional" : status.plan });
      setIsSubscriptionLoaded(true);
    } catch {
      // Keep the last known status during a transient network failure.
      setIsSubscriptionLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

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

        const previousRole = prevRoleRef.current;
        if (previousRole !== null && fresh.role !== previousRole) {
          const label = ROLE_LABELS[fresh.role] ?? fresh.role;
          const wasDowngraded =
            (previousRole === "admin" && fresh.role !== "admin") ||
            (previousRole === "manager" && fresh.role === "employee");

          toast({
            title: "Your access level has changed",
            description: wasDowngraded
              ? `Your role has been updated to ${label}. You may lose access to some pages.`
              : `Your access level has been updated to ${label}.`,
          });

          prevRoleRef.current = fresh.role;
        } else if (previousRole === null) {
          prevRoleRef.current = fresh.role;
        }

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
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token,
      subscription,
      isSubscriptionLoaded,
      isTeamPlan: subscription?.plan === "team",
      refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
