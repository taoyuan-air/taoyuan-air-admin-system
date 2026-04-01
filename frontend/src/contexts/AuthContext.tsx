import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, RoleCode } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: (User & { password: string })[] = [
  {
    userId: 1,
    username: 'admin',
    password: import.meta.env.VITE_MOCK_ADMIN_PASSWORD as string,
    email: 'admin@taoyuan-air.gov.tw',
    fullName: '系統管理員',
    roleCode: 'super_admin',
    roleName: '超級管理員',
    organization: '桃園市政府',
    uploadQuotaGb: 100,
    isActive: true,
    createdAt: '2024-01-01',
  },
  {
    userId: 2,
    username: 'manager',
    password: import.meta.env.VITE_MOCK_MANAGER_PASSWORD as string,
    email: 'manager@taoyuan-air.gov.tw',
    fullName: '資料管理員',
    roleCode: 'data_manager' as RoleCode,
    roleName: '資料管理員',
    organization: '環保局',
    uploadQuotaGb: 20,
    isActive: true,
    createdAt: '2024-01-01',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (username: string, password: string) => {
    const found = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (!found) throw new Error('帳號或密碼錯誤');
    const { password: _pw, ...userWithoutPassword } = found;
    setUser(userWithoutPassword);
    sessionStorage.setItem('auth_user', JSON.stringify(userWithoutPassword));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
