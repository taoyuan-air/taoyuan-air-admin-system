import type { Dispatch, SetStateAction } from "react";
import StatusBadge from "../../components/StatusBadge";
import {
  DATA_TYPE_LABELS,
  STATION_LABELS,
  type DbRecord,
  type PageSizeOption,
  formatSize,
  formatTime,
  statusToBadge,
} from "./sourceDatabaseHelpers";

interface SourceDatabaseTableProps {
  loading: boolean;
  records: DbRecord[];
  filteredCount: number;
  keyword: string;
  isSftp: boolean;
  selectedIds: Set<number>;
  selectableIds: number[];
  isAllSelected: boolean;
  isIndeterminate: boolean;
  pageSize: PageSizeOption;
  currentPage: number;
  totalPages: number;
  startIdx: number;
  endIdx: number;
  onToggleAll: () => void;
  onToggleOne: (id: number) => void;
  onPageChange: Dispatch<SetStateAction<number>>;
}

export default function SourceDatabaseTable({
  loading,
  records,
  filteredCount,
  keyword,
  isSftp,
  selectedIds,
  selectableIds,
  isAllSelected,
  isIndeterminate,
  pageSize,
  currentPage,
  totalPages,
  startIdx,
  endIdx,
  onToggleAll,
  onToggleOne,
  onPageChange,
}: SourceDatabaseTableProps) {
  return (
    <>
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>載入中...</div>
      ) : (
        <div className="table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <th style={{ padding: "8px 12px", width: 40 }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={onToggleAll}
                    disabled={selectableIds.length === 0}
                    className="custom-checkbox"
                  />
                </th>
                {["檔案名稱", isSftp ? "資料類型" : "測站", "檔案大小", isSftp ? "來源" : "上傳者", "上傳時間", "狀態"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#999", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "32px 12px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
                    {keyword ? "沒有符合條件的記錄" : "尚無資料"}
                  </td>
                </tr>
              ) : records.map((record) => {
                const isSelected = selectedIds.has(record.uploadId);
                const isUploading = record.uploadStatus === "uploading";
                return (
                  <tr key={record.uploadId} style={{
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                    backgroundColor: isSelected ? "rgba(239,68,68,0.04)" : undefined,
                    transition: "background-color 0.1s",
                  }}>
                    <td style={{ padding: "12px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isUploading && onToggleOne(record.uploadId)}
                        disabled={isUploading}
                        className="custom-checkbox"
                      />
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{record.fileName}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#666" }}>
                      {isSftp
                        ? record.dataType
                          ? DATA_TYPE_LABELS[record.dataType] ?? record.dataType
                          : "-"
                        : STATION_LABELS[record.station ?? ""] ?? record.station ?? "-"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#666" }}>{formatSize(record.fileSize)}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#666" }}>{record.username ?? "-"}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#666" }}>{formatTime(record.createdAt)}</td>
                    <td style={{ padding: "12px" }}><StatusBadge status={statusToBadge(record.uploadStatus)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          顯示 {startIdx}–{endIdx} / 共 {filteredCount} 筆
        </span>
        {pageSize !== "All" && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", backgroundColor: currentPage === 1 ? "#f3f4f6" : "#fff", color: currentPage === 1 ? "#9ca3af" : "#374151", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: 12 }}
            >
              上一頁
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                style={{ minWidth: 30, height: 30, borderRadius: 8, border: `1px solid ${page === currentPage ? "#6abe74" : "#d1d5db"}`, backgroundColor: page === currentPage ? "#6abe74" : "#fff", color: page === currentPage ? "#fff" : "#374151", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", backgroundColor: currentPage === totalPages ? "#f3f4f6" : "#fff", color: currentPage === totalPages ? "#9ca3af" : "#374151", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: 12 }}
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </>
  );
}
