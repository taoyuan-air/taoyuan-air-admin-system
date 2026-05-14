import { FileSpreadsheet, Trash2 } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportDialog({
  open,
  selectedCount,
  onClose,
  onConfirm,
}: ExportDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        backgroundColor: "rgba(0,0,0,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(460px, calc(100vw - 32px))",
          borderRadius: 16,
          backgroundColor: "#F4F2E9",
          boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
          padding: 22,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#374151",
            marginBottom: 8,
          }}
        >
          確認匯出 Excel
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          即將將已選取的 <strong>{selectedCount}</strong> 筆記錄匯出為 Excel
          檔案。
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.14)",
              backgroundColor: "transparent",
              color: "#6b7280",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#6abe74",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FileSpreadsheet size={14} /> 確認匯出
          </button>
        </div>
      </div>
    </div>
  );
}

interface BatchDeleteDialogProps {
  open: boolean;
  selectedCount: number;
  error: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchDeleteDialog({
  open,
  selectedCount,
  error,
  isDeleting,
  onClose,
  onConfirm,
}: BatchDeleteDialogProps) {
  if (!open) return null;

  const closeIfIdle = () => {
    if (!isDeleting) onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        backgroundColor: "rgba(0,0,0,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={closeIfIdle}
    >
      <div
        style={{
          width: "min(460px, calc(100vw - 32px))",
          borderRadius: 16,
          backgroundColor: "#F4F2E9",
          boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
          padding: 22,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#374151",
            marginBottom: 8,
          }}
        >
          確認批次刪除
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          你即將刪除 <strong>{selectedCount}</strong>{" "}
          筆上傳歷史記錄，刪除後將同步移除資料庫紀錄與檔案，且無法復原。
        </div>
        {error && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 10px",
              borderRadius: 8,
              backgroundColor: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#dc2626",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.14)",
              backgroundColor: "transparent",
              color: "#6b7280",
              fontSize: 13,
              cursor: isDeleting ? "not-allowed" : "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              backgroundColor: isDeleting ? "#fca5a5" : "#ef4444",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Trash2 size={14} />
            {isDeleting ? "刪除中..." : `確認刪除 (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}