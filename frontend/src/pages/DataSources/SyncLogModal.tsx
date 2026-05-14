import { AlertCircle, CheckCircle, X, XCircle } from "lucide-react";
import type { SourceRecord } from "../../contexts/AppDataContext";
import { mockLogs } from "./dataSourceHelpers";
import type { SyncLog } from "./dataSourceHelpers";

function LogStatusIcon({ status }: { status: SyncLog["status"] }) {
  if (status === "success") return <CheckCircle size={13} color="#6abe74" />;
  if (status === "error") return <XCircle size={13} color="#e57373" />;
  return <AlertCircle size={13} color="#f0a500" />;
}

interface SyncLogModalProps {
  source: SourceRecord | null;
  onClose: () => void;
}

export default function SyncLogModal({ source, onClose }: SyncLogModalProps) {
  if (!source) return null;

  const logs = mockLogs[source.id] ?? [];

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#F4F2E9",
          borderRadius: 20,
          padding: 28,
          width: "min(520px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 2,
              }}
            >
              同步日誌
            </h2>
            <div style={{ fontSize: 12, color: "#999" }}>{source.name}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={18} color="#999" />
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {logs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: "#999",
                fontSize: 13,
              }}
            >
              尚無同步記錄
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ marginTop: 1 }}>
                  <LogStatusIcon status={log.status} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#374151" }}>
                    {log.message}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
                    {log.time}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 20,
                    color:
                      log.status === "success"
                        ? "#6abe74"
                        : log.status === "error"
                          ? "#e57373"
                          : "#f0a500",
                    backgroundColor:
                      log.status === "success"
                        ? "rgba(106,190,116,0.12)"
                        : log.status === "error"
                          ? "rgba(229,115,115,0.12)"
                          : "rgba(240,165,0,0.12)",
                  }}
                >
                  {log.status === "success"
                    ? "成功"
                    : log.status === "error"
                      ? "失敗"
                      : "等待中"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
