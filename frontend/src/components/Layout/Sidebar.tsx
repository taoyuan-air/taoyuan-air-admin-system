import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Database,
  Radio,
  Users,
  Leaf,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { path: "/", label: "儀表板", Icon: LayoutDashboard },
  { path: "/upload", label: "資料上傳", Icon: Upload },
  { path: "/data-sources", label: "資料來源", Icon: Database },
  { path: "/stations", label: "測站管理", Icon: Radio },
  { path: "/users", label: "使用者管理", Icon: Users },
];

function UserBlock() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div
      style={{
        margin: "0 12px",
        padding: "12px",
        backgroundColor: "rgba(106,190,116,0.08)",
        borderRadius: 12,
        border: "1px solid rgba(106,190,116,0.2)",
      }}
    >
      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>目前登入</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
        {user.fullName}
      </div>
      <div style={{ fontSize: 11, color: "#6abe74", marginBottom: 10 }}>
        {user.roleName}
        {user.organization && ` · ${user.organization}`}
      </div>
      <button
        onClick={logout}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          backgroundColor: "transparent",
          border: "1px solid rgba(106,190,116,0.4)",
          borderRadius: 8,
          fontSize: 12,
          color: "#6b7280",
          cursor: "pointer",
        }}
      >
        <LogOut size={13} />
        登出
      </button>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        backgroundColor: "rgba(255,255,255,0.85)",
        borderRight: "1px solid rgba(106,190,116,0.2)",
        display: "flex",
        flexDirection: "column",
        padding: "0 0 24px 0",
        backdropFilter: "blur(10px)",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px",
          borderBottom: "1px solid rgba(106,190,116,0.15)",
          marginBottom: 8,
        }}
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
            }}
          >
            <Leaf size={18} color="#fff" />
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
        {navItems.map(({ path, label, Icon }) => (
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
  );
}
