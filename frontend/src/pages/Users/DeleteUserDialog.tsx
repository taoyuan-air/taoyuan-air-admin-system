import { Info, X } from "lucide-react";
import { roleConfig, type UserRow } from "./userHelpers";

interface DeleteUserDialogProps {
  user: UserRow | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteUserDialog({
  user,
  onClose,
  onConfirm,
}: DeleteUserDialogProps) {
  if (!user) return null;

  return (
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
          padding: 28,
          width: "min(400px, calc(100vw - 32px))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(220,38,38,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
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
            刪除使用者
          </h2>
          <button
            onClick={onClose}
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

        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.8)",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            padding: "16px 20px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: roleConfig[user.roleCode]?.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: roleConfig[user.roleCode]?.color,
                flexShrink: 0,
              }}
            >
              {user.fullName[0]}
            </div>
            <div>
              <div
                style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}
              >
                {user.fullName}
              </div>
              <div
                style={{ fontSize: 12, color: "#999", fontFamily: "monospace" }}
              >
                {user.username}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
          }}
        >
          <Info size={13} color="#999" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>
            此操作無法復原，該帳號將從資料庫中永久刪除。
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
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
            onClick={onConfirm}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#dc2626",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}
