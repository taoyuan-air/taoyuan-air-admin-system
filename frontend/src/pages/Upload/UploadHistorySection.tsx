import type { Dispatch, SetStateAction } from "react";
import Select from "react-select";
import type { StylesConfig } from "react-select";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import type { HistoryRecord } from "../../contexts/AppDataContext";
import { PAGE_SIZE_OPTIONS, type PageSizeOption } from "./uploadHelpers";

interface PageSizeSelectOption {
  value: PageSizeOption;
  label: string;
}

const historyPageSizeOptions: PageSizeSelectOption[] = PAGE_SIZE_OPTIONS.map(
  (option) => ({
    value: option,
    label: option === "All" ? "全部" : `${option} 筆`,
  }),
);

const historySelectStyles: StylesConfig<PageSizeSelectOption, false> = {
  control: (base, state) => ({
    ...base,
    borderRadius: 8,
    border: `1px solid ${state.isFocused ? "#6abe74" : "rgba(0,0,0,0.12)"}`,
    boxShadow: state.isFocused ? "0 0 0 2px rgba(106,190,116,0.2)" : "none",
    backgroundColor: "#fff",
    fontSize: 13,
    minHeight: 38,
    "&:hover": { borderColor: "#6abe74" },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "rgba(106,190,116,0.12)"
      : state.isFocused
        ? "rgba(106,190,116,0.06)"
        : "#fff",
    color: state.isSelected ? "#2d6a4f" : "#374151",
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: 13,
    cursor: "pointer",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#374151",
    fontWeight: 600,
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#6abe74",
    padding: "0 8px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 10,
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    border: "1px solid rgba(106,190,116,0.2)",
  }),
  menuList: (base) => ({ ...base, padding: 4 }),
};

const historySearchInputStyle = {
  width: 280,
  maxWidth: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.12)",
  fontSize: 13,
  color: "#374151",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box" as const,
  minHeight: 38,
};

interface UploadHistorySectionProps {
  historySearchKeyword: string;
  historyPageSize: PageSizeOption;
  historyCurrentPage: number;
  historyTotalPages: number;
  historyStartIndex: number;
  historyEndIndex: number;
  filteredHistoryLength: number;
  paginatedHistory: HistoryRecord[];
  selectedIds: Set<number>;
  setHistoryCurrentPage: Dispatch<SetStateAction<number>>;
  onSearchChange: (value: string) => void;
  onPageSizeChange: (value: PageSizeOption) => void;
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: number) => void;
  onClearSelection: () => void;
  onOpenExportDialog: () => void;
  onOpenBatchDeleteDialog: () => void;
}

export default function UploadHistorySection({
  historySearchKeyword,
  historyPageSize,
  historyCurrentPage,
  historyTotalPages,
  historyStartIndex,
  historyEndIndex,
  filteredHistoryLength,
  paginatedHistory,
  selectedIds,
  setHistoryCurrentPage,
  onSearchChange,
  onPageSizeChange,
  onToggleSelectAll,
  onToggleSelectOne,
  onClearSelection,
  onOpenExportDialog,
  onOpenBatchDeleteDialog,
}: UploadHistorySectionProps) {
  return (
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: selectedIds.size > 0 ? 12 : 24,
            flexWrap: "wrap",
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#374151",
              margin: 0,
            }}
          >
            上傳歷史記錄
          </h3>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={historySearchKeyword}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜尋檔案名稱、上傳者、測站"
              style={historySearchInputStyle}
            />
            <div
              style={{
                width: 128,
                minWidth: 128,
              }}
            >
              <Select<PageSizeSelectOption, false>
                options={historyPageSizeOptions}
                value={historyPageSizeOptions.find(
                  (option) => option.value === historyPageSize,
                )}
                onChange={(option) => onPageSizeChange(option?.value ?? 10)}
                styles={historySelectStyles}
                isSearchable={false}
              />
            </div>
          </div>
        </div>

        {/* 批次操作列 */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 16,
              marginTop: 18,
              padding: "8px 8px 8px 12px",
              borderRadius: 8,
              backgroundColor: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>
              已選取 <strong>{selectedIds.size}</strong> 筆
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginRight: 8,
              }}
            >
              <button
                onClick={() => onOpenExportDialog()}
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
                onClick={() => {
                  onOpenBatchDeleteDialog();
                }}
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
            </div>
            <button
              onClick={() => onClearSelection()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "transparent",
                color: "#9ca3af",
                fontSize: 18,
                lineHeight: 1,
                cursor: "pointer",
                flexShrink: 0,
                transition: "background-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.06)";
                e.currentTarget.style.color = "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#9ca3af";
              }}
              title="取消選取"
            >
              ×
            </button>
          </div>
        )}
        <div className="table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <th style={{ padding: "8px 12px", width: 40 }}>
                  {(() => {
                    const selectableIds = paginatedHistory
                      .filter((r) => r.status !== "processing")
                      .map((r) => r.id as number);
                    const checkedCount = selectableIds.filter((id) =>
                      selectedIds.has(id),
                    ).length;
                    const isAll =
                      selectableIds.length > 0 &&
                      checkedCount === selectableIds.length;
                    const isIndeterminate = checkedCount > 0 && !isAll;
                    return (
                      <input
                        type="checkbox"
                        checked={isAll}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={onToggleSelectAll}
                        disabled={selectableIds.length === 0}
                        className="custom-checkbox"
                        title="全選"
                      />
                    );
                  })()}
                </th>
                {[
                  "檔案名稱",
                  "測站",
                  "檔案大小",
                  "上傳者",
                  "上傳時間",
                  "狀態",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: 12,
                      color: "#999",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "20px 12px",
                      textAlign: "center",
                      fontSize: 13,
                      color: "#9ca3af",
                    }}
                  >
                    沒有符合條件的歷史記錄
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((r) => {
                  const isSelected = selectedIds.has(r.id as number);
                  const isProcessing = r.status === "processing";
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: "1px solid rgba(0,0,0,0.04)",
                        backgroundColor: isSelected
                          ? "rgba(239,68,68,0.04)"
                          : undefined,
                        transition: "background-color 0.1s",
                      }}
                    >
                      <td style={{ padding: "12px" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            !isProcessing && onToggleSelectOne(r.id as number)
                          }
                          disabled={isProcessing}
                          className="custom-checkbox"
                          title={isProcessing ? "上傳進行中，暫時無法選取" : ""}
                        />
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          color: "#374151",
                          fontWeight: 500,
                        }}
                      >
                        {r.name}
                      </td>
                      <td
                        style={{ padding: "12px", fontSize: 13, color: "#666" }}
                      >
                        {r.station ?? "—"}
                      </td>
                      <td
                        style={{ padding: "12px", fontSize: 13, color: "#666" }}
                      >
                        {r.size}
                      </td>
                      <td
                        style={{ padding: "12px", fontSize: 13, color: "#666" }}
                      >
                        {r.user}
                      </td>
                      <td
                        style={{ padding: "12px", fontSize: 13, color: "#666" }}
                      >
                        {r.time}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 20,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            顯示 {historyStartIndex}-{historyEndIndex} / 共{" "}
            {filteredHistoryLength} 筆
          </span>

          {historyPageSize !== "All" && historyTotalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() =>
                  setHistoryCurrentPage((prev) => Math.max(1, prev - 1))
                }
                disabled={historyCurrentPage === 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  backgroundColor:
                    historyCurrentPage === 1 ? "#f3f4f6" : "#fff",
                  color: historyCurrentPage === 1 ? "#9ca3af" : "#374151",
                  cursor: historyCurrentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: 12,
                }}
              >
                上一頁
              </button>

              {Array.from({ length: historyTotalPages }, (_, index) => {
                const page = index + 1;
                const isActive = page === historyCurrentPage;
                return (
                  <button
                    key={page}
                    onClick={() => setHistoryCurrentPage(page)}
                    style={{
                      minWidth: 30,
                      height: 30,
                      borderRadius: 8,
                      border: `1px solid ${isActive ? "#6abe74" : "#d1d5db"}`,
                      backgroundColor: isActive ? "#6abe74" : "#fff",
                      color: isActive ? "#fff" : "#374151",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setHistoryCurrentPage((prev) =>
                    Math.min(historyTotalPages, prev + 1),
                  )
                }
                disabled={historyCurrentPage === historyTotalPages}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  backgroundColor:
                    historyCurrentPage === historyTotalPages
                      ? "#f3f4f6"
                      : "#fff",
                  color:
                    historyCurrentPage === historyTotalPages
                      ? "#9ca3af"
                      : "#374151",
                  cursor:
                    historyCurrentPage === historyTotalPages
                      ? "not-allowed"
                      : "pointer",
                  fontSize: 12,
                }}
              >
                下一頁
              </button>
            </div>
          )}
        </div>
      </Card>
  );
}
