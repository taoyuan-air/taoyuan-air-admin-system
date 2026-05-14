import { FileSpreadsheet, Trash2 } from "lucide-react";

interface SourceDatabaseDialogsProps {
  showExportDialog: boolean;
  showDeleteDialog: boolean;
  selectedCount: number;
  isDeleting: boolean;
  deleteError: string | null;
  onCloseExportDialog: () => void;
  onCloseDeleteDialog: () => void;
  onConfirmExport: () => void;
  onConfirmDelete: () => void;
}

export default function SourceDatabaseDialogs({
  showExportDialog,
  showDeleteDialog,
  selectedCount,
  isDeleting,
  deleteError,
  onCloseExportDialog,
  onCloseDeleteDialog,
  onConfirmExport,
  onConfirmDelete,
}: SourceDatabaseDialogsProps) {
  return (
    <>
      {showExportDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 220, backgroundColor: "rgba(0,0,0,0.28)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={onCloseExportDialog}>
          <div style={{ width: "min(460px, calc(100vw - 32px))", borderRadius: 16, backgroundColor: "#F4F2E9", boxShadow: "0 12px 30px rgba(0,0,0,0.18)", padding: 22 }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>確認匯出 Excel</div>
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
              即將將已選取的 <strong>{selectedCount}</strong> 筆記錄匯出為 Excel 檔案。
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button onClick={onCloseExportDialog} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)", backgroundColor: "transparent", color: "#6b7280", fontSize: 13, cursor: "pointer" }}>取消</button>
              <button onClick={onConfirmExport} style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: "#6abe74", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileSpreadsheet size={14} /> 確認匯出
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 220, backgroundColor: "rgba(0,0,0,0.28)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => { if (!isDeleting) onCloseDeleteDialog(); }}>
          <div style={{ width: "min(460px, calc(100vw - 32px))", borderRadius: 16, backgroundColor: "#F4F2E9", boxShadow: "0 12px 30px rgba(0,0,0,0.18)", padding: 22 }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>確認批次刪除</div>
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
              你即將刪除 <strong>{selectedCount}</strong> 筆記錄，刪除後將同步移除資料庫紀錄與檔案，且無法復原。
            </div>
            {deleteError && (
              <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 8, backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#dc2626", fontSize: 12 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button onClick={onCloseDeleteDialog} disabled={isDeleting}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)", backgroundColor: "transparent", color: "#6b7280", fontSize: 13, cursor: isDeleting ? "not-allowed" : "pointer" }}>取消</button>
              <button onClick={onConfirmDelete} disabled={isDeleting}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: isDeleting ? "#fca5a5" : "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: isDeleting ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Trash2 size={14} /> {isDeleting ? "刪除中..." : `確認刪除 (${selectedCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
