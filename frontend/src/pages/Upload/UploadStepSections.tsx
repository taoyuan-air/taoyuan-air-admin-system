import type { ChangeEvent, DragEvent, RefObject } from "react";
import {
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileText,
  FolderCheck,
  MapPin,
  RotateCcw,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import {
  ALLOWED_EXTS,
  STATION_DISTRICTS,
  STATION_OPTIONS,
  formatSize,
  type StagedFile,
  type StationOption,
  type UploadResult,
  type UploadingFile,
  type ValidationError,
} from "./uploadHelpers";

interface UploadStepperProps {
  step: 1 | 2 | 3;
}

export function UploadStepper({ step }: UploadStepperProps) {
  const steps: [string, string][] = [
    ["1", "選擇測站"],
    ["2", "上傳檔案"],
    ["3", "上傳結果"],
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 24,
      }}
    >
      {steps.map(([n, label], i) => {
        const num = Number(n);
        const done = step > num;
        const active = step === num;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: done || active ? "#6abe74" : "#e5e7eb",
                  color: done || active ? "#fff" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {done ? "✓" : n}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#374151" : "#9ca3af",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 40,
                  height: 2,
                  backgroundColor: step > num ? "#6abe74" : "#e5e7eb",
                  margin: "0 12px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface StationSelectSectionProps {
  selectedStation: StationOption | "";
  hoveredStation: StationOption | "";
  onSelectStation: (station: StationOption) => void;
  onHoverStation: (station: StationOption | "") => void;
  onNext: () => void;
}

export function StationSelectSection({
  selectedStation,
  hoveredStation,
  onSelectStation,
  onHoverStation,
  onNext,
}: StationSelectSectionProps) {
  return (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 4,
              }}
            >
              選擇上傳測站
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              請選擇這批檔案所屬測站
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(140px, min-content))",
              gridTemplateRows: "auto",
              gridAutoFlow: "row",
              gap: 10,
              justifyContent: "start",
            }}
          >
            {STATION_OPTIONS.map((station) => {
              const active = selectedStation === station;
              return (
                <button
                  key={station}
                  type="button"
                  onClick={() => onSelectStation(station)}
                  onMouseEnter={() => onHoverStation(station)}
                  onMouseLeave={() => onHoverStation("")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "auto",
                    minWidth: 140,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: active
                      ? "2px solid #6abe74"
                      : hoveredStation === station
                        ? "1.5px solid rgba(106,190,116,0.5)"
                        : "1.5px solid rgba(0,0,0,0.10)",
                    backgroundColor: active
                      ? "rgba(106,190,116,0.07)"
                      : hoveredStation === station
                        ? "rgba(106,190,116,0.03)"
                        : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s, background-color 0.15s",
                    outline: "none",
                  }}
                >
                  {/* Radio dot */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${active ? "#6abe74" : "#d1d5db"}`,
                      backgroundColor: active ? "#6abe74" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: "#fff",
                        }}
                      />
                    )}
                  </div>

                  {/* Station info */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <MapPin size={14} color={active ? "#6abe74" : "#9ca3af"} />
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: active ? "#1a4731" : "#374151",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {station}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 20,
            }}
          >
            <button
              onClick={() => onNext()}
              disabled={!selectedStation}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                backgroundColor: !selectedStation ? "#d1d5db" : "#6abe74",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: !selectedStation ? "not-allowed" : "pointer",
                transition: "background-color 0.15s",
              }}
            >
              下一步 <ChevronRight size={16} />
            </button>
          </div>
        </Card>
  );
}

interface FileUploadSectionProps {
  selectedStation: StationOption | "";
  isDragging: boolean;
  isUploading: boolean;
  stagedFiles: StagedFile[];
  uploadingFiles: UploadingFile[];
  validationErrors: ValidationError[];
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDraggingChange: (isDragging: boolean) => void;
  onDrop: (event: DragEvent) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearValidationErrors: () => void;
  onClearStagedFiles: () => void;
  onRemoveStagedFile: (id: string) => void;
  onBack: () => void;
  onStartUpload: () => void;
}

export function FileUploadSection({
  selectedStation,
  isDragging,
  isUploading,
  stagedFiles,
  uploadingFiles,
  validationErrors,
  uploadError,
  fileInputRef,
  onDraggingChange,
  onDrop,
  onFileChange,
  onClearValidationErrors,
  onClearStagedFiles,
  onRemoveStagedFile,
  onBack,
  onStartUpload,
}: FileUploadSectionProps) {
  return (
        <Card style={{ marginBottom: 20 }}>
          {/* 已選測站確認列 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              padding: "10px 14px",
              backgroundColor: "rgba(106,190,116,0.08)",
              borderRadius: 10,
              border: "1px solid rgba(106,190,116,0.25)",
              fontSize: 13,
            }}
          >
            <MapPin size={14} color="#6abe74" style={{ flexShrink: 0 }} />
            <span style={{ color: "#6b7280" }}>上傳至測站：</span>
            <span style={{ fontWeight: 700, color: "#2d6a4f" }}>
              {selectedStation}
            </span>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>
              （{STATION_DISTRICTS[selectedStation as StationOption]}）
            </span>
          </div>

          {/* 檔案格式說明列 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              padding: "10px 14px",
              backgroundColor: "rgba(106,190,116,0.06)",
              borderRadius: 10,
              fontSize: 12,
              color: "#6b7280",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <FileText size={11} />
              {ALLOWED_EXTS.join(", ")}
            </span>
            <span>·</span>
            <span style={{ color: "#6b7280" }}>無大小限制</span>
          </div>

          {/* 拖放區 — 上傳進行中時隱藏 */}
          {!isUploading && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                onDraggingChange(true);
              }}
              onDragLeave={() => onDraggingChange(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? "#6abe74" : "rgba(106,190,116,0.4)"}`,
                borderRadius: 16,
                padding: "40px 24px",
                textAlign: "center",
                backgroundColor: isDragging
                  ? "rgba(106,190,116,0.08)"
                  : "rgba(106,190,116,0.03)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <CloudUpload
                  size={40}
                  color={isDragging ? "#6abe74" : "rgba(106,190,116,0.5)"}
                />
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                {isDragging ? "放開以加入檔案" : "拖拽檔案至此處"}
              </div>
              <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
                或點擊選擇檔案，支援批次上傳
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "#6abe74",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                選擇檔案
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.csv"
                style={{ display: "none" }}
                onChange={onFileChange}
              />
            </div>
          )}

          {uploadError && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#dc2626",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {uploadError}
            </div>
          )}

          {/* ── 驗證錯誤提示（拖放區下方） ── */}
          {!isUploading && validationErrors.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: validationErrors.length > 1 ? 10 : 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <XCircle size={15} color="#ef4444" />
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}
                  >
                    {validationErrors.length === 1
                      ? "1 個檔案無法加入"
                      : `${validationErrors.length} 個檔案無法加入`}
                  </span>
                </div>
                <button
                  onClick={() => onClearValidationErrors()}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: "0 2px",
                  }}
                  title="關閉"
                >
                  ×
                </button>
              </div>
              {validationErrors.map((err, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "6px 0",
                    borderTop:
                      i === 0 ? "1px solid rgba(239,68,68,0.15)" : "none",
                    marginTop: i === 0 ? 8 : 0,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: "rgba(239,68,68,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#ef4444",
                    }}
                  >
                    格
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      {err.fileName}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}
                    >
                      {err.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 已選檔案清單（可刪除，上傳前顯示） */}
          {!isUploading && stagedFiles.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}
                >
                  已選檔案
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: "rgba(106,190,116,0.12)",
                      color: "#6abe74",
                      padding: "2px 8px",
                      borderRadius: 20,
                    }}
                  >
                    {stagedFiles.length} 個
                  </span>
                </div>
                <button
                  onClick={() => onClearStagedFiles()}
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Trash2 size={12} /> 清除全部
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stagedFiles.map((sf) => (
                  <div
                    key={sf.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(106,190,116,0.2)",
                      backgroundColor: "rgba(106,190,116,0.03)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <FileText size={16} color="#6abe74" />
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#374151",
                          }}
                        >
                          {sf.file.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            marginTop: 1,
                          }}
                        >
                          {formatSize(sf.file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveStagedFile(sf.id)}
                      style={{
                        padding: "4px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: 6,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#ef4444")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#9ca3af")
                      }
                      title="移除"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 上傳進度列表（上傳中才顯示） ── */}
          {isUploading && uploadingFiles.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <UploadCloud
                  size={16}
                  color="#6abe74"
                  style={{ animation: "spin 1.2s linear infinite" }}
                />
                <span
                  style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}
                >
                  上傳進度
                </span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {
                    uploadingFiles.filter((f) => f.status !== "uploading")
                      .length
                  }{" "}
                  / {uploadingFiles.length} 完成
                </span>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {uploadingFiles.map((uf) => (
                  <div
                    key={uf.id}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: `1px solid ${
                        uf.status === "completed"
                          ? "rgba(106,190,116,0.3)"
                          : uf.status === "failed"
                            ? "rgba(239,68,68,0.2)"
                            : "rgba(106,190,116,0.15)"
                      }`,
                      backgroundColor:
                        uf.status === "completed"
                          ? "rgba(106,190,116,0.05)"
                          : uf.status === "failed"
                            ? "rgba(239,68,68,0.04)"
                            : "#fff",
                      transition: "background-color 0.3s, border-color 0.3s",
                    }}
                  >
                    {/* 檔名列 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: uf.status === "uploading" ? 10 : 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {uf.status === "completed" && (
                          <CheckCircle2 size={15} color="#6abe74" />
                        )}
                        {uf.status === "failed" && (
                          <XCircle size={15} color="#ef4444" />
                        )}
                        {uf.status === "uploading" && (
                          <UploadCloud
                            size={15}
                            color="#6abe74"
                            style={{ animation: "spin 1.2s linear infinite" }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#374151",
                          }}
                        >
                          {uf.file.name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          {formatSize(uf.file.size)}
                        </span>
                        <StatusBadge status={uf.status} />
                      </div>
                    </div>

                    {/* 進度條（僅上傳中顯示） */}
                    {uf.status === "uploading" && (
                      <>
                        <div
                          style={{
                            height: 6,
                            backgroundColor: "rgba(0,0,0,0.06)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${uf.progress}%`,
                              backgroundColor: "#6abe74",
                              borderRadius: 3,
                              transition: "width 0.25s ease",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            marginTop: 4,
                            textAlign: "right",
                          }}
                        >
                          {uf.progress}%
                        </div>
                      </>
                    )}

                    {/* 失敗時的進度條（停滯，紅色） */}
                    {uf.status === "failed" && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            height: 6,
                            backgroundColor: "rgba(239,68,68,0.1)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${uf.progress}%`,
                              backgroundColor: "#ef4444",
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#ef4444",
                            marginTop: 4,
                            textAlign: "right",
                          }}
                        >
                          上傳失敗 ({uf.progress}%)
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 底部操作列 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginTop: 20,
            }}
          >
            <button
              onClick={() => onBack()}
              disabled={isUploading}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1.5px solid #d1d5db",
                backgroundColor: "#fff",
                color: isUploading ? "#9ca3af" : "#374151",
                fontSize: 14,
                fontWeight: 600,
                cursor: isUploading ? "not-allowed" : "pointer",
              }}
            >
              返回上一步
            </button>
            <button
              onClick={onStartUpload}
              disabled={
                stagedFiles.length === 0 || !selectedStation || isUploading
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                backgroundColor:
                  stagedFiles.length === 0 || !selectedStation || isUploading
                    ? "#d1d5db"
                    : "#6abe74",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  stagedFiles.length === 0 || !selectedStation || isUploading
                    ? "not-allowed"
                    : "pointer",
                transition: "background-color 0.15s",
              }}
            >
              {isUploading ? (
                <>
                  <UploadCloud
                    size={16}
                    style={{ animation: "spin 1.2s linear infinite" }}
                  />{" "}
                  上傳中…
                </>
              ) : (
                <>
                  <UploadCloud size={16} /> 開始上傳{" "}
                  {stagedFiles.length > 0 ? `(${stagedFiles.length})` : ""}
                </>
              )}
            </button>
          </div>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </Card>
  );
}

interface UploadResultSectionProps {
  results: UploadResult[];
  onUploadAgain: () => void;
  onResetAll: () => void;
}

export function UploadResultSection({
  results,
  onUploadAgain,
  onResetAll,
}: UploadResultSectionProps) {
  const successCount = results.filter((r) => r.status === "completed").length;
  const failCount = results.filter((r) => r.status === "failed").length;
  const allSuccess = failCount === 0 && results.length > 0;

  return (
        <Card style={{ marginBottom: 20 }}>
          {/* 大圖示結果標題 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "32px 0 24px",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                backgroundColor: allSuccess
                  ? "rgba(106,190,116,0.12)"
                  : failCount === results.length
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(251,191,36,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {allSuccess ? (
                <FolderCheck size={38} color="#6abe74" />
              ) : failCount === results.length ? (
                <XCircle size={38} color="#ef4444" />
              ) : (
                <CheckCircle2 size={38} color="#f59e0b" />
              )}
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#374151",
                  marginBottom: 4,
                }}
              >
                {allSuccess
                  ? "全部上傳成功！"
                  : failCount === results.length
                    ? "上傳失敗"
                    : `部分上傳成功`}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                共 {results.length} 個檔案：
                <span style={{ color: "#6abe74", fontWeight: 600 }}>
                  成功 {successCount}
                </span>
                {failCount > 0 && (
                  <>
                    {" "}
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>
                      失敗 {failCount}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 每個檔案的結果 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {results.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1px solid ${r.status === "completed" ? "rgba(106,190,116,0.25)" : "rgba(239,68,68,0.2)"}`,
                  backgroundColor:
                    r.status === "completed"
                      ? "rgba(106,190,116,0.05)"
                      : "rgba(239,68,68,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {r.status === "completed" ? (
                    <CheckCircle2 size={18} color="#6abe74" />
                  ) : (
                    <XCircle size={18} color="#ef4444" />
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      {r.file.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}
                    >
                      {formatSize(r.file.size)}
                    </div>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>

          {/* 兩個出口 */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              onClick={onUploadAgain}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                borderRadius: 8,
                border: "1.5px solid #6abe74",
                backgroundColor: "transparent",
                color: "#6abe74",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={15} /> 再上傳
            </button>
            <button
              onClick={onResetAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#6abe74",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <CheckCircle2 size={15} /> 完成
            </button>
          </div>
        </Card>
  );
}
