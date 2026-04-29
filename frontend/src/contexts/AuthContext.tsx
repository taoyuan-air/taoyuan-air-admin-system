/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User, RoleCode } from "../types";
import { apiUrl, isDemoMode } from "../config/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearMustChangePassword: (newToken?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: User[] = [
  {
    userId: 1,
    username: "admin",
    email: "admin@taoyuan-air.gov.tw",
    fullName: "系統管理員",
    roleCode: "system_admin" as RoleCode,
    roleName: "系統管理員",
    organization: "桃園市政府",
    uploadQuotaGb: 100,
    isActive: true,
    mustChangePassword: false,
    createdAt: "2024-01-01",
  },
  {
    userId: 2,
    username: "manager",
    email: "manager@taoyuan-air.gov.tw",
    fullName: "資料管理員",
    roleCode: "data_manager" as RoleCode,
    roleName: "資料管理員",
    organization: "環保局",
    uploadQuotaGb: 20,
    isActive: true,
    mustChangePassword: false,
    createdAt: "2024-01-01",
  },
  {
    userId: 3,
    username: "viewer",
    email: "viewer@taoyuan-air.gov.tw",
    fullName: "唯讀使用者",
    roleCode: "readonly" as RoleCode,
    roleName: "唯讀使用者",
    organization: "桃園市政府",
    uploadQuotaGb: 0,
    isActive: true,
    mustChangePassword: false,
    createdAt: "2024-01-01",
  },
];

const MOCK_PASSWORD_BY_USERNAME: Record<string, string | undefined> = {
  admin: import.meta.env.VITE_MOCK_ADMIN_PASSWORD,
  manager: import.meta.env.VITE_MOCK_MANAGER_PASSWORD,
  viewer: import.meta.env.VITE_MOCK_VIEWER_PASSWORD,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("auth_token"),
  );

  const login = async (username: string, password: string) => {
    if (isDemoMode) {
      const found = MOCK_USERS.find((u) => u.username === username);
      if (!found) throw new Error("帳號或密碼錯誤");

      const expectedPassword = MOCK_PASSWORD_BY_USERNAME[found.username];
      if (!expectedPassword) {
        throw new Error(
          "Demo 模式尚未設定該帳號密碼，請設定 VITE_MOCK_*_PASSWORD。",
        );
      }
      if (password !== expectedPassword) throw new Error("帳號或密碼錯誤");

      const userWithoutPassword = found;
      setUser(userWithoutPassword);
      setToken("demo-token");
      sessionStorage.setItem("auth_user", JSON.stringify(userWithoutPassword));
      sessionStorage.setItem("auth_token", "demo-token");
      return;
    }

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

    const { token: jwt, user: userData } = data as {
      token: string;
      user: User;
    };
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

  const clearMustChangePassword = (newToken?: string) => {
    if (!user) return;
    const updated = { ...user, mustChangePassword: false };
    setUser(updated);
    sessionStorage.setItem("auth_user", JSON.stringify(updated));
    if (newToken) {
      setToken(newToken);
      sessionStorage.setItem("auth_token", newToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, clearMustChangePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
