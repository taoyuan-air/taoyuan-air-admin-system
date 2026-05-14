import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../components/Layout/Header";
import { apiUrl } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import DeleteUserDialog from "./DeleteUserDialog";
import TempPasswordModal from "./TempPasswordModal";
import UserFormModal from "./UserFormModal";
import UserTable from "./UserTable";
import {
  emptyForm,
  roleConfig,
  validateUserForm,
  type UserRow,
} from "./userHelpers";

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
  const [tempPassword, setTempPassword] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const fetchUsers = useCallback(async () => {
    const res = await fetch(apiUrl("/api/users"), { headers: authHeader });
    if (res.ok) {
      const data = (await res.json()) as { users: UserRow[] };
      setUsers(data.users);
    }
  }, [authHeader]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUsers();
  }, [fetchUsers]);

  const filtered =
    filterRole === "all"
      ? users
      : users.filter((u) => u.roleCode === filterRole);
  const isEditing = editingUser !== null;

  const handleClose = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setApiError("");
  };

  const handleSubmit = async () => {
    const validationErrors = validateUserForm(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
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

  const handleEdit = (user: UserRow) => {
    setEditingUser(user);
    setForm({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      roleCode: user.roleCode,
      org: user.organization ?? "",
      quota: user.uploadQuotaGb,
    });
    setShowModal(true);
  };

  const toggleActive = async (user: UserRow) => {
    const res = await fetch(apiUrl(`/api/users/${user.userId}/active`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ isActive: !user.isActive }),
    });

    if (res.ok) {
      const data = (await res.json()) as { user: UserRow };
      setUsers((prev) =>
        prev.map((u) => (u.userId === user.userId ? data.user : u)),
      );
    }
  };

  const handleCopy = () => {
    if (!tempPassword) return;
    void navigator.clipboard.writeText(tempPassword.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeTempPassword = () => {
    setTempPassword(null);
    setCopied(false);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    const res = await fetch(apiUrl(`/api/users/${deletingUser.userId}`), {
      method: "DELETE",
      headers: authHeader,
    });

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.userId !== deletingUser.userId));
    }
    setDeletingUser(null);
  };

  return (
    <div>
      <Header title="使用者管理" subtitle="帳號管理、角色權限與上傳配額設定" />

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

      <UserTable
        users={filtered}
        onEdit={handleEdit}
        onToggleActive={toggleActive}
        onDelete={setDeletingUser}
      />

      <UserFormModal
        open={showModal}
        isEditing={isEditing}
        form={form}
        errors={errors}
        apiError={apiError}
        submitting={submitting}
        setForm={setForm}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />

      <TempPasswordModal
        tempPassword={tempPassword}
        copied={copied}
        onCopy={handleCopy}
        onClose={closeTempPassword}
      />

      <DeleteUserDialog
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
