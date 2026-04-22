import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppDataProvider } from './contexts/AppDataContext';
import Sidebar from './components/Layout/Sidebar';
import { Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import DataSources from './pages/DataSources';
import SourceDatabase from './pages/SourceDatabase';
import Stations from './pages/Stations';
import Users from './pages/Users';
import ChangePasswordPage from './pages/ChangePassword';
import LoginPage from './pages/Login';
import type { RoleCode } from './types';

const ROUTE_ROLES: Record<string, RoleCode[]> = {
  '/upload': ['system_admin', 'data_manager'],
  '/users':  ['system_admin'],
};

function GuardedRoute({ path, element }: { path: string; element: React.ReactElement }) {
  const { user } = useAuth();
  const allowed = ROUTE_ROLES[path];
  if (allowed && user && !allowed.includes(user.roleCode as RoleCode)) {
    return <Navigate to="/" replace />;
  }
  return element;
}

function AppContent() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handler = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (!user) return <LoginPage />;

  // 已登入但需強制修改密碼
  if (user.mustChangePassword) return <ChangePasswordPage />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F4F2E9' }}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
      <main style={{
        flex: 1,
        marginLeft: sidebarOpen ? 220 : 0,
        padding: sidebarOpen ? '32px 32px 32px 48px' : '32px 32px 32px 64px',
        minHeight: '100vh',
        transition: 'margin-left 0.25s ease',
      }}>
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="展開側欄"
            style={{
              position: 'fixed', top: 16, left: 16, zIndex: 101,
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(106,190,116,0.3)',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <Menu size={16} color="#6abe74" />
          </button>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<GuardedRoute path="/upload" element={<Upload />} />} />
          <Route path="/data-sources" element={<DataSources />} />
          <Route path="/source-db/:category" element={<SourceDatabase />} />
          <Route path="/stations" element={<Stations />} />
          <Route path="/users" element={<GuardedRoute path="/users" element={<Users />} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <AppContent />
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
