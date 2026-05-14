import { FileSpreadsheet, Search, Trash2 } from "lucide-react";
import Select from "react-select";
import {
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  selectStyles,
} from "./sourceDatabaseHelpers";

interface SourceDatabaseToolbarProps {
  categoryLabel?: string;
  isSftp: boolean;
  keyword: string;
  pageSize: PageSizeOption;
  selectedCount: number;
  onKeywordChange: (value: string) => void;
  onPageSizeChange: (value: PageSizeOption) => void;
  onOpenExportDialog: () => void;
  onOpenDeleteDialog: () => void;
  onClearSelection: () => void;
}

export default function SourceDatabaseToolbar({
  categoryLabel,
  isSftp,
  keyword,
  pageSize,
  selectedCount,
  onKeywordChange,
  onPageSizeChange,
  onOpenExportDialog,
  onOpenDeleteDialog,
  onClearSelection,
}: SourceDatabaseToolbarProps) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: selectedCount > 0 ? 12 : 20, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: 0 }}>
          {categoryLabel} 上傳記錄
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} color="#9ca3af" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder={isSftp ? "搜尋檔名、類型、上傳者" : "搜尋檔名、測站、上傳者"}
              style={{
                paddingLeft: 30,
                paddingRight: 12,
                paddingTop: 9,
                paddingBottom: 9,
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.12)",
                fontSize: 13,
                color: "#374151",
                backgroundColor: "#fff",
                outline: "none",
                width: 240,
              }}
            />
          </div>
          <div style={{ width: 120 }}>
            <Select
              options={PAGE_SIZE_OPTIONS}
              value={PAGE_SIZE_OPTIONS.find((o) => o.value === pageSize)}
              onChange={(opt) => onPageSizeChange(opt?.value ?? 10)}
              styles={selectStyles}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          padding: "8px 8px 8px 12px",
          borderRadius: 8,
          backgroundColor: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>
            已選取 <strong>{selectedCount}</strong> 筆
          </span>
          <button
            onClick={onOpenExportDialog}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#6abe74",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FileSpreadsheet size={13} /> 匯出 Excel
          </button>
          <button
            onClick={onOpenDeleteDialog}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#ef4444",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Trash2 size={13} /> 刪除選取
          </button>
          <button
            onClick={onClearSelection}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "transparent",
              color: "#9ca3af",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
