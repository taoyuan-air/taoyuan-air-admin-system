import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, Info } from "lucide-react";
import Select from "react-select";
import Card from "../../components/Card";
import Header from "../../components/Layout/Header";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { apiUrl } from "../../config/api";

const roleConfig: Record<string, { label: string; color: string; bg: string }> =
  {
    system_admin: {
      label: "系統管理員",
      color: "#2d6a4f",
      bg: "rgba(45,106,79,0.12)",
    },
    data_manager: {
      label: "資料管理員",
      color: "#6abe74",
      bg: "rgba(106,190,116,0.12)",
    },
    readonly: {
      label: "唯讀使用者",
      color: "#a0a98f",
      bg: "rgba(160,169,143,0.15)",
    },
  };

interface UserRow {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  roleCode: string;
  organization?: string;
  isActive: boolean;
  lastLogin?: string;
  uploadQuotaGb: number;
}

const roleOptions = Object.entries(roleConfig).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  color: cfg.color,
  bg: cfg.bg,
}));

const selectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    borderRadius: 8,
    border: `1px solid ${state.isFocused ? "#6abe74" : "rgba(0,0,0,0.12)"}`,
    boxShadow: state.isFocused ? "0 0 0 2px rgba(106,190,116,0.2)" : "none",
    backgroundColor: "#fff",
    fontSize: 13,
    minHeight: 38,
    "&:hover": { borderColor: "#6abe74" },
  }),
  option: (
    base: object,
    state: {
      isSelected: boolean;
      isFocused: boolean;
      data: (typeof roleOptions)[0];
    },
  ) => ({
    ...base,
    backgroundColor: state.isSelected
      ? state.data.bg
      : state.isFocused
        ? "rgba(106,190,116,0.06)"
        : "#fff",
    color: state.isSelected ? state.data.color : "#374151",
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: 13,
    cursor: "pointer",
  }),
  singleValue: (base: object, state: { data: (typeof roleOptions)[0] }) => ({
    ...base,
    color: state.data.color,
    fontWeight: 600,
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base: object) => ({
    ...base,
    color: "#6abe74",
    padding: "0 8px",
  }),
  menu: (base: object) => ({
    ...base,
    borderRadius: 10,
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    border: "1px solid rgba(106,190,116,0.2)",
  }),
  menuList: (base: object) => ({ ...base, padding: 4 }),
};

const emptyForm = {
  fullName: "",
  username: "",
  email: "",
  roleCode: "readonly",
  org: "",
  quota: 10,
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.12)",
  fontSize: 13,
  color: "#374151",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  display: "block" as const,
  fontSize: 12,
  color: "#666",
  marginBottom: 6,
  fontWeight: 600 as const,
};

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  // 臨時密碼 Modal
  const [tempPassword, setTempPassword] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    const res = await fetch(apiUrl("/api/users"), { headers: authHeader });
    if (res.ok) {
      const data = (await res.json()) as { users: UserRow[] };
      setUsers(data.users);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered =
    filterRole === "all"
      ? users
      : users.filter((u) => u.roleCode === filterRole);
  const isEditing = editingUser !== null;

  const validate = () => {
    const e: Partial<typeof emptyForm> = {};
    if (!form.fullName.trim()) e.fullName = "請輸入姓名";
    if (!form.username.trim()) e.username = "請輸入帳號";
    if (!form.email.trim()) e.email = "請輸入 Email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email 格式不正確";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSubmitting(true);
    setApiError("");

    if (isEditing) {
      const res = await fetch(apiUrl(`/api/users/${editingUser.userId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          roleCode: form.roleCode,
          organization: form.org.trim() || null,
          uploadQuotaGb: Number(form.quota),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.message ?? "儲存失敗");
        setSubmitting(false);
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === editingUser.userId ? (data.user as UserRow) : u,
        ),
      );
      handleClose();
    } else {
      const res = await fetch(apiUrl("/api/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          roleCode: form.roleCode,
          organization: form.org.trim() || null,
          uploadQuotaGb: Number(form.quota),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.message ?? "新增失敗");
        setSubmitting(false);
        return;
      }
      setUsers((prev) => [...prev, data.user as UserRow]);
      handleClose();
      setTempPassword({
        username: data.user.username,
        password: data.temporaryPassword,
      });
    }
    setSubmitting(false);
  };

  const handleEdit = (u: UserRow) => {
    setEditingUser(u);
    setForm({
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      roleCode: u.roleCode,
      org: u.organization ?? "",
      quota: u.uploadQuotaGb,
    });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setApiError("");
  };

  const toggleActive = async (u: UserRow) => {
    const res = await fetch(apiUrl(`/api/users/${u.userId}/active`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: UserRow };
      setUsers((prev) =>
        prev.map((x) => (x.userId === u.userId ? data.user : x)),
      );
    }
  };

  const handleCopy = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    const res = await fetch(apiUrl(`/api/users/${deletingUser.userId}`), {
      method: 'DELETE',
      headers: authHeader,
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.userId !== deletingUser.userId));
    }
    setDeletingUser(null);
  };

  return (
    <div>
      <Header title="使用者管理" subtitle="帳號管理、角色權限與上傳配額設定" />

      {/* Role filter */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {Object.entries(roleConfig).map(([key, cfg]) => {
          const count = users.filter((u) => u.roleCode === key).length;
          const isActive = filterRole === key;
          return (
            <button
              key={key}
              onClick={() => setFilterRole(isActive ? "all" : key)}
              style={{
                padding: "12px",
                borderRadius: 12,
                border: `1px solid ${isActive ? cfg.color : "rgba(0,0,0,0.08)"}`,
                backgroundColor: isActive ? cfg.bg : "rgba(255,255,255,0.8)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color }}>
                {count}
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                {cfg.label}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6abe74",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 新增使用者
        </button>
      </div>

      <Card>
        <div className="table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                {[
                  "使用者",
                  "帳號",
                  "角色",
                  "組織",
                  "上傳配額",
                  "最後登入",
                  "狀態",
                  "操作",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 12,
                      color: "#999",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.userId}
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                >
                  <td style={{ padding: "12px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          backgroundColor: roleConfig[u.roleCode]?.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          color: roleConfig[u.roleCode]?.color,
                        }}
                      >
                        {u.fullName[0]}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#374151",
                          }}
                        >
                          {u.fullName}
                        </div>
                        <div style={{ fontSize: 11, color: "#999" }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      fontSize: 12,
                      color: "#666",
                      fontFamily: "monospace",
                    }}
                  >
                    {u.username}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        color: roleConfig[u.roleCode]?.color,
                        backgroundColor: roleConfig[u.roleCode]?.bg,
                      }}
                    >
                      {roleConfig[u.roleCode]?.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#666" }}>
                    {u.organization || "—"}
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#666" }}>
                    {u.uploadQuotaGb} GB
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#666" }}>
                    {u.lastLogin
                      ? new Date(u.lastLogin).toLocaleString("zh-TW", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <StatusBadge status={u.isActive ? "active" : "inactive"} />
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleEdit(u)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(106,190,116,0.4)",
                          backgroundColor: "transparent",
                          color: "#6abe74",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(0,0,0,0.12)",
                          backgroundColor: "transparent",
                          color: "#888",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {u.isActive ? "停用" : "啟用"}
                      </button>
                      <button
                        onClick={() => setDeletingUser(u)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(220,38,38,0.25)",
                          backgroundColor: "transparent",
                          color: "#dc2626",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 新增/編輯 Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={handleClose}
        >
          <div
            style={{
              backgroundColor: "#F4F2E9",
              borderRadius: 20,
              padding: 28,
              width: "min(480px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>
                {isEditing ? "編輯使用者" : "新增使用者"}
              </h2>
              <button
                onClick={handleClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={18} color="#999" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>姓名 *</label>
                  <input
                    style={{
                      ...inputStyle,
                      borderColor: errors.fullName
                        ? "#e57373"
                        : "rgba(0,0,0,0.12)",
                    }}
                    value={form.fullName}
                    placeholder="請輸入姓名"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, fullName: e.target.value }))
                    }
                  />
                  {errors.fullName && (
                    <div
                      style={{ fontSize: 11, color: "#e57373", marginTop: 4 }}
                    >
                      {errors.fullName}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>帳號 *</label>
                  <input
                    style={{
                      ...inputStyle,
                      borderColor: errors.username
                        ? "#e57373"
                        : "rgba(0,0,0,0.12)",
                    }}
                    value={form.username}
                    placeholder="請輸入帳號"
                    disabled={isEditing}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, username: e.target.value }))
                    }
                  />
                  {errors.username && (
                    <div
                      style={{ fontSize: 11, color: "#e57373", marginTop: 4 }}
                    >
                      {errors.username}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: errors.email ? "#e57373" : "rgba(0,0,0,0.12)",
                  }}
                  value={form.email}
                  placeholder="example@taoyuan.gov.tw"
                  type="email"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
                {errors.email && (
                  <div style={{ fontSize: 11, color: "#e57373", marginTop: 4 }}>
                    {errors.email}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>角色 *</label>
                  <Select
                    options={roleOptions}
                    value={roleOptions.find((o) => o.value === form.roleCode)}
                    onChange={(opt) =>
                      setForm((p) => ({
                        ...p,
                        roleCode: opt?.value ?? "readonly",
                        quota: opt?.value === "readonly" ? 0 : p.quota,
                      }))
                    }
                    styles={selectStyles}
                    isSearchable={false}
                    formatOptionLabel={(opt) => (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          color: opt.color,
                          backgroundColor: opt.bg,
                        }}
                      >
                        {opt.label}
                      </span>
                    )}
                  />
                </div>
                <div>
                  <label style={labelStyle}>上傳配額 (GB)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={0}
                    max={1000}
                    value={form.quota}
                    disabled={form.roleCode === "readonly"}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, quota: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>組織</label>
                <input
                  style={inputStyle}
                  value={form.org}
                  placeholder="所屬組織（選填）"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, org: e.target.value }))
                  }
                />
              </div>
            </div>

            {apiError && (
              <div
                style={{
                  marginTop: 16,
                  padding: "8px 12px",
                  backgroundColor: "#fef2f2",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                }}
              >
                {apiError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
              }}
            >
              <button
                onClick={handleClose}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  backgroundColor: "transparent",
                  color: "#666",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: submitting ? "#a3d9a8" : "#6abe74",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "處理中..." : isEditing ? "儲存" : "新增"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 臨時密碼 Modal */}
      {tempPassword && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            backgroundColor: "rgba(55,65,81,0.25)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#F4F2E9",
              borderRadius: 20,
              padding: 32,
              width: "min(420px, calc(100vw - 32px))",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              border: "1px solid rgba(106,190,116,0.25)",
            }}
          >
            {/* 標題列 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#374151",
                  margin: 0,
                }}
              >
                帳號建立成功
              </h2>
              <button
                onClick={() => {
                  setTempPassword(null);
                  setCopied(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={18} color="#999" />
              </button>
            </div>

            {/* 帳號 / 臨時密碼 卡片 */}
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.8)",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.3)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                padding: "20px 20px 16px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#999",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  帳號
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#374151",
                    fontFamily: "monospace",
                  }}
                >
                  {tempPassword.username}
                </span>
              </div>
              <div
                style={{
                  height: 1,
                  backgroundColor: "rgba(0,0,0,0.06)",
                  marginBottom: 14,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#999",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  臨時密碼
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      letterSpacing: 3,
                      color: "#2d6a4f",
                      backgroundColor: "rgba(45,106,79,0.07)",
                      padding: "4px 12px",
                      borderRadius: 8,
                    }}
                  >
                    {tempPassword.password}
                  </span>
                  <button
                    onClick={handleCopy}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      border: `1px solid ${copied ? "rgba(106,190,116,0.5)" : "rgba(0,0,0,0.1)"}`,
                      backgroundColor: copied
                        ? "rgba(106,190,116,0.12)"
                        : "rgba(255,255,255,0.9)",
                      color: copied ? "#6abe74" : "#888",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 提示文字 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 24,
                marginTop: 4,
              }}
            >
              <Info size={15} color="#999" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>
                首次登入後系統將強制要求修改密碼，密碼僅此次顯示。
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setTempPassword(null);
                  setCopied(false);
                }}
                style={{
                  padding: "9px 28px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#6abe74",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(106,190,116,0.35)",
                }}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 刪除確認 Modal */}
      {deletingUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          backgroundColor: 'rgba(55,65,81,0.25)',
          backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: '#F4F2E9', borderRadius: 20, padding: 28,
            width: 'min(400px, calc(100vw - 32px))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid rgba(220,38,38,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151', margin: 0 }}>刪除使用者</h2>
              <button onClick={() => setDeletingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <X size={18} color="#999" />
              </button>
            </div>

            <div style={{
              backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              padding: '16px 20px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  backgroundColor: roleConfig[deletingUser.roleCode]?.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: roleConfig[deletingUser.roleCode]?.color, flexShrink: 0,
                }}>{deletingUser.fullName[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{deletingUser.fullName}</div>
                  <div style={{ fontSize: 12, color: '#999', fontFamily: 'monospace' }}>{deletingUser.username}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
              <Info size={13} color="#999" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>此操作無法復原，該帳號將從資料庫中永久刪除。</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeletingUser(null)} style={{
                padding: '9px 20px', borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                backgroundColor: 'transparent', color: '#666',
                fontSize: 13, cursor: 'pointer',
              }}>取消</button>
              <button onClick={handleDelete} style={{
                padding: '9px 20px', borderRadius: 10, border: 'none',
                backgroundColor: '#dc2626', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
