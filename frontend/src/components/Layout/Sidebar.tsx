import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Database,
  Radio,
  Users,
  Wind,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import type { RoleCode } from "../../types";

const navItems: { path: string; label: string; Icon: React.ElementType; allowedRoles: RoleCode[] }[] = [
  { path: "/",            label: "儀表板",   Icon: LayoutDashboard, allowedRoles: ['system_admin', 'data_manager', 'readonly'] },
  { path: "/upload",      label: "資料上傳", Icon: Upload,          allowedRoles: ['system_admin', 'data_manager'] },
  { path: "/data-sources",label: "資料來源", Icon: Database,        allowedRoles: ['system_admin', 'data_manager', 'readonly'] },
  { path: "/stations",   label: "測站管理", Icon: Radio,           allowedRoles: ['system_admin', 'data_manager', 'readonly'] },
  { path: "/users",      label: "使用者管理",Icon: Users,           allowedRoles: ['system_admin'] },
];

function UserBlock() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div
      style={{
        margin: "0 12px",
        padding: "14px 14px 12px",
        backgroundColor: "rgba(106,190,116,0.08)",
        borderRadius: 12,
        border: "1px solid rgba(106,190,116,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          letterSpacing: 0.4,
          marginBottom: 8,
        }}
      >
        目前登入
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>
          {user.fullName}
        </div>
        <div style={{ fontSize: 12, color: "#4b5563", fontWeight: 700 }}>
          {user.username}
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          color: "#6abe74",
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        {user.roleName}
        {user.organization && ` · ${user.organization}`}
      </div>

      <button
        onClick={logout}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          padding: "7px 10px",
          backgroundColor: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(106,190,116,0.4)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: "#4b5563",
          cursor: "pointer",
        }}
      >
        <LogOut size={13} />
        登出
      </button>
    </div>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const visibleItems = navItems.filter(item =>
    user ? item.allowedRoles.includes(user.roleCode as RoleCode) : false
  );
  return (
    <>
      {/* 手機版遮罩 */}
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            display: "none",
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 99,
          }}
          className="sidebar-overlay"
        />
      )}
      <aside
        style={{
          width: 220,
          minHeight: "100vh",
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRight: "1px solid rgba(106,190,116,0.2)",
          display: "flex",
          flexDirection: "column",
          padding: "0 0 24px 0",
          backdropFilter: "blur(10px)",
          position: "fixed",
          top: 0,
          left: isOpen ? 0 : -220,
          bottom: 0,
          zIndex: 100,
          transition: "left 0.25s ease",
        }}
      >
        {/* Logo — 點擊收合 */}
        <div
          onClick={onToggle}
          title="收合側欄"
          style={{
            padding: "24px 20px",
            borderBottom: "1px solid rgba(106,190,116,0.15)",
            marginBottom: 8,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(106,190,116,0.06)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                backgroundColor: "#6abe74",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Wind size={18} color="#fff" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#374151",
                  lineHeight: 1.2,
                }}
              >
                Taoyuan-Air
              </div>
              <div style={{ fontSize: 11, color: "#6abe74", fontWeight: 600 }}>
                後台管控系統
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {visibleItems.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: 4,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#fff" : "#374151",
                backgroundColor: isActive ? "#6abe74" : "transparent",
                transition: "all 0.15s",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} color={isActive ? "#fff" : "#6abe74"} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <UserBlock />
      </aside>
    </>
  );
}
