import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User, RoleCode } from "../types";
import { apiUrl } from "../config/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: (User & { password: string })[] = [
  {
    userId: 1,
    username: "admin",
    password: "REMOVED_REVOKED_SECRET",
    email: "admin@taoyuan-air.gov.tw",
    fullName: "系統管理員",
    roleCode: "super_admin",
    roleName: "超級管理員",
    organization: "桃園市政府",
    uploadQuotaGb: 100,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    userId: 2,
    username: "manager",
    password: "REMOVED_REVOKED_SECRET",
    email: "manager@taoyuan-air.gov.tw",
    fullName: "資料管理員",
    roleCode: "data_manager" as RoleCode,
    roleName: "資料管理員",
    organization: "環保局",
    uploadQuotaGb: 20,
    isActive: true,
    createdAt: "2024-01-01",
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("auth_token"),
  );

  const login = async (username: string, password: string) => {
    // 先驗證本地 mock（保持前端 UI 不變）
    const found = MOCK_USERS.find(
      (u) => u.username === username && u.password === password,
    );
    if (!found) throw new Error("帳號或密碼錯誤");

    // 向後端取得真實 JWT
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error("帳號或密碼錯誤");
    const { token: jwt } = (await res.json()) as { token: string };

    const { password: _pw, ...userWithoutPassword } = found;
    setUser(userWithoutPassword);
    setToken(jwt);
    sessionStorage.setItem("auth_user", JSON.stringify(userWithoutPassword));
    sessionStorage.setItem("auth_token", jwt);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
