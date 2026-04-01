import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { tokenStorage } from "../lib/tokenStorage";
import type { User } from "../types/api";

type AuthState = {
  user: User | null;
  token: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState(() => tokenStorage.get());
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(
    async (authToken: string) => {
      if (!authToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get<{ user: User }>("/api/auth/me", authToken);
        setUser(res.user);
      } catch {
        tokenStorage.clear();
        setToken("");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadMe(token);
  }, [loadMe, token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>("/api/auth/login", {
      email,
      password,
    });
    tokenStorage.set(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>("/api/auth/register", {
      name,
      email,
      password,
    });
    tokenStorage.set(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken("");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
