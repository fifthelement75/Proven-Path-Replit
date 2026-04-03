import { useState, useCallback } from "react";
import { getUser, getToken, setToken, setUser, removeToken, type User } from "@/lib/auth";

export function useAuth() {
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

  return { user, token, login, logout, isAuthenticated: !!token };
}
