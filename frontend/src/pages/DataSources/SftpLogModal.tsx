import { X } from "lucide-react";
import type { SourceRecord } from "../../contexts/AppDataContext";
import type { SftpLog } from "./dataSourceHelpers";

interface SftpLogModalProps {
  source: SourceRecord | null;
  logs: SftpLog[];
  loading: boolean;
  onClose: () => void;
}

export default function SftpLogModal({
  source,
  logs,
  loading,
  onClose,
}: SftpLogModalProps) {
  if (!source) return null;

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
          padding: "28px 32px",
          width: "min(900px, calc(100vw - 48px))",
          maxHeight: "calc(100vh - 48px)",
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
              傳輸記錄
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

        <div style={{ overflowY: "auto", overflowX: "auto", flex: 1 }}>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: "#999",
                fontSize: 13,
              }}
            >
              載入中...
            </div>
          ) : (
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  {[
                    { label: "檔案名稱", width: "36%" },
                    { label: "資料時間", width: "10%" },
                    { label: "狀態", width: "10%" },
                    { label: "接收時間", width: "24%" },
                    { label: "錯誤訊息", width: "20%" },
                  ].map((heading) => (
                    <th
                      key={heading.label}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        color: "#999",
                        fontWeight: 600,
                        width: heading.width,
                      }}
                    >
                      {heading.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "32px",
                        textAlign: "center",
                        color: "#999",
                      }}
                    >
                      尚無傳輸記錄
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => {
                    const statusColor =
                      log.status === "parsed"
                        ? "#6abe74"
                        : log.status === "failed"
                          ? "#e57373"
                          : "#f0a500";
                    const statusLabel =
                      log.status === "parsed"
                        ? "已解析"
                        : log.status === "failed"
                          ? "失敗"
                          : "已接收";
                    return (
                      <tr
                        key={index}
                        style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}
                      >
                        <td
                          style={{
                            padding: "12px 14px",
                            color: "#374151",
                            fontFamily: "monospace",
                            fontSize: 12,
                            wordBreak: "break-all",
                          }}
                        >
                          {log.fileName}
                        </td>
                        <td style={{ padding: "12px 14px", color: "#555" }}>
                          {log.dataTime}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 20,
                              color: statusColor,
                              backgroundColor:
                                log.status === "parsed"
                                  ? "rgba(106,190,116,0.12)"
                                  : log.status === "failed"
                                    ? "rgba(229,115,115,0.12)"
                                    : "rgba(240,165,0,0.12)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#555" }}>
                          {log.time}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            color: "#e57373",
                            fontSize: 12,
                          }}
                        >
                          {log.errorMsg ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
