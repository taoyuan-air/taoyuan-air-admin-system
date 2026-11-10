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

function readStoredSession(): { user: User | null; token: string | null } {
  try {
    const token = sessionStorage.getItem("auth_token");
    const saved = sessionStorage.getItem("auth_user");
    if (token && saved && (isDemoMode ? token === "demo-token" : token !== "demo-token")) {
      const user: User = JSON.parse(saved);
      if (user && typeof user === "object" && Number.isSafeInteger(user.userId)
          && ["system_admin", "data_manager", "readonly"].includes(user.roleCode)) {
        return { user, token };
      }
    }
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
  } catch {
    // Corrupt or unavailable browser storage must not crash the login page.
  }
  return { user: null, token: null };
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(readStoredSession);
  const [user, setUser] = useState<User | null>(initialSession.user);
  const [token, setToken] = useState<string | null>(initialSession.token);

  const login = async (username: string, password: string) => {
    if (isDemoMode) {
      const found = MOCK_USERS.find((u) => u.username === username);
      if (!found) throw new Error("帳號或密碼錯誤");

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
