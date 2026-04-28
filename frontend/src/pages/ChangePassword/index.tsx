import { useState } from "react";
import type { FormEvent } from "react";
import { Wind, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { apiUrl } from "../../config/api";

export default function ChangePasswordPage() {
  const { token, clearMustChangePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("兩次輸入的新密碼不一致");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      setError("新密碼至少需 8 碼，且包含英文與數字");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "修改失敗");
        return;
      }
      clearMustChangePassword((data as { token?: string }).token);
    } catch {
      setError("無法連線到後端 API");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F4F2E9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: "40px 36px",
          width: "min(400px, calc(100vw - 32px))",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid rgba(106,190,116,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div
            style={{
              width: 40, height: 40, backgroundColor: "#6abe74",
              borderRadius: 12, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Wind size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>Taoyuan-Air</div>
            <div style={{ fontSize: 12, color: "#6abe74", fontWeight: 600 }}>後台管控系統</div>
          </div>
        </div>

        <div
          style={{
            marginBottom: 24, padding: "10px 14px",
            backgroundColor: "#fffbeb", borderRadius: 8,
            fontSize: 13, color: "#92400e",
            border: "1px solid #fde68a",
          }}
        >
          您正在使用臨時密碼，請設定新密碼後繼續使用系統。
        </div>

        <form onSubmit={handleSubmit}>
          {([
            { label: "目前密碼", value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
            { label: "新密碼", value: newPassword, setter: setNewPassword, show: showNew, toggle: () => setShowNew((v) => !v) },
            { label: "確認新密碼", value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm((v) => !v) },
          ] as const).map(({ label, value, setter, show, toggle }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#374151", fontWeight: 500, display: "block", marginBottom: 6 }}>
                {label}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  required
                  style={{ ...inputStyle, padding: "10px 40px 10px 12px" }}
                />
                <button
                  type="button"
                  onClick={toggle}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: 10, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#9ca3af", display: "flex", alignItems: "center", padding: 0,
                  }}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}

          {error && (
            <div
              style={{
                marginBottom: 16, padding: "8px 12px",
                backgroundColor: "#fef2f2", borderRadius: 8,
                fontSize: 13, color: "#dc2626",
                border: "1px solid #fecaca",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "11px",
              backgroundColor: loading ? "#a3d9a8" : "#6abe74",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "修改中..." : "確認修改密碼"}
          </button>
        </form>
      </div>
    </div>
  );
}
