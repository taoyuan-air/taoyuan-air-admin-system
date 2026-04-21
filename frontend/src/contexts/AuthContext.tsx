/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { apiUrl } from "../config/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("auth_token"),
  );

  const login = async (username: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      throw new Error("無法連線到後端 API，請確認 backend 已啟動。");
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message ?? "登入失敗");
    }

    const { token: jwt, user: userData } = data as { token: string; user: User };
    setUser(userData);
    setToken(jwt);
    sessionStorage.setItem("auth_user", JSON.stringify(userData));
    sessionStorage.setItem("auth_token", jwt);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("auth_token");
  };

  const clearMustChangePassword = () => {
    if (!user) return;
    const updated = { ...user, mustChangePassword: false };
    setUser(updated);
    sessionStorage.setItem("auth_user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
