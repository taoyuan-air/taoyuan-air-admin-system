import { Check, Copy, Info, X } from "lucide-react";

interface TempPassword {
  username: string;
  password: string;
}

interface TempPasswordModalProps {
  tempPassword: TempPassword | null;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

export default function TempPasswordModal({
  tempPassword,
  copied,
  onCopy,
  onClose,
}: TempPasswordModalProps) {
  if (!tempPassword) return null;

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
          padding: 32,
          width: "min(420px, calc(100vw - 32px))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(106,190,116,0.25)",
        }}
      >
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
                onClick={onCopy}
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
            onClick={onClose}
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
  );
}
