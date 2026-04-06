import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import {
  CloudUpload,
  FileText,
  Package,
  Wind,
  Plane,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  UploadCloud,
  Trash2,
  RotateCcw,
  FolderCheck,
} from "lucide-react";
import Card from "../../components/Card";
import Header from "../../components/Layout/Header";
import StatusBadge from "../../components/StatusBadge";
import { useAppData } from "../../contexts/AppDataContext";

type DataCategory = "lidar" | "uav";
type LidarSubType = "point_cloud" | "wind_field" | "boundary_layer";
type UAVSubType = "sensor" | "flight_path" | "imagery" | "meteorological";

const MB = 1024 * 1024;

interface SubTypeConfig {
  label: string;
  formats: string;
  maxSize: string;
  allowedExts: string[];
  maxSizeBytes: number;
}

const lidarConfig: Record<LidarSubType, SubTypeConfig> = {
  point_cloud: {
    label: "點雲資料",
    formats: ".las, .laz, .ply, .pcd, .xyz",
    maxSize: "500 MB",
    allowedExts: [".las", ".laz", ".ply", ".pcd", ".xyz"],
    maxSizeBytes: 500 * MB,
  },
  wind_field: {
    label: "風場資料",
    formats: ".nc, .hdf5, .csv, .json",
    maxSize: "100 MB",
    allowedExts: [".nc", ".hdf5", ".csv", ".json"],
    maxSizeBytes: 100 * MB,
  },
  boundary_layer: {
    label: "大氣邊界層",
    formats: ".nc, .csv, .json",
    maxSize: "50 MB",
    allowedExts: [".nc", ".csv", ".json"],
    maxSizeBytes: 50 * MB,
  },
};

const uavConfig: Record<UAVSubType, SubTypeConfig> = {
  sensor: {
    label: "感測器資料",
    formats: ".csv, .json, .xml, .txt",
    maxSize: "100 MB",
    allowedExts: [".csv", ".json", ".xml", ".txt"],
    maxSizeBytes: 100 * MB,
  },
  flight_path: {
    label: "飛行軌跡",
    formats: ".kml, .gpx, .csv, .json",
    maxSize: "10 MB",
    allowedExts: [".kml", ".gpx", ".csv", ".json"],
    maxSizeBytes: 10 * MB,
  },
  imagery: {
    label: "影像資料",
    formats: ".jpg, .png, .tiff, .raw",
    maxSize: "200 MB",
    allowedExts: [".jpg", ".jpeg", ".png", ".tiff", ".raw"],
    maxSizeBytes: 200 * MB,
  },
  meteorological: {
    label: "氣象資料",
    formats: ".csv, .json, .nc",
    maxSize: "50 MB",
    allowedExts: [".csv", ".json", ".nc"],
    maxSizeBytes: 50 * MB,
  },
};

interface StagedFile {
  id: string;
  file: File;
}

interface ValidationError {
  fileName: string;
  reason: "ext" | "size";
  detail: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "failed";
}

interface UploadResult {
  id: string;
  file: File;
  status: "completed" | "failed";
}


export default function Upload() {
  const { uploadHistory: history, setUploadHistory: setHistory } = useAppData();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [category, setCategory] = useState<DataCategory | null>(null);
  const [lidarType, setLidarType] = useState<LidarSubType>("point_cloud");
  const [uavType, setUavType] = useState<UAVSubType>("sensor");
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const errTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredCategory, setHoveredCategory] = useState<DataCategory | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentConfig =
    category === "lidar"
      ? lidarConfig[lidarType]
      : category === "uav"
        ? uavConfig[uavType]
        : null;

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  // Validate then stage files — rejected files surface as inline errors
  const stageFiles = (files: File[]) => {
    if (!currentConfig) return;
    const errors: ValidationError[] = [];
    const accepted: StagedFile[] = [];

    for (const f of files) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      const extOk = currentConfig.allowedExts.includes(ext);
      const sizeOk = f.size <= currentConfig.maxSizeBytes;

      if (!extOk) {
        errors.push({
          fileName: f.name,
          reason: "ext",
          detail: `不支援的格式（${ext}），僅接受 ${currentConfig.formats}`,
        });
      } else if (!sizeOk) {
        errors.push({
          fileName: f.name,
          reason: "size",
          detail: `檔案過大（${formatSize(f.size)}），上限為 ${currentConfig.maxSize}`,
        });
      } else {
        // Avoid duplicates already in staged list
        const isDuplicate = stagedFiles.some(
          (sf) => sf.file.name === f.name && sf.file.size === f.size,
        );
        if (isDuplicate) {
          errors.push({
            fileName: f.name,
            reason: "ext",
            detail: "此檔案已在待上傳清單中",
          });
        } else {
          accepted.push({
            id: `${Date.now()}-${f.name}-${Math.random()}`,
            file: f,
          });
        }
      }
    }

    if (accepted.length > 0) setStagedFiles((prev) => [...prev, ...accepted]);

    if (errors.length > 0) {
      setValidationErrors(errors);
      // Auto-dismiss after 8 s
      if (errTimerRef.current) clearTimeout(errTimerRef.current);
      errTimerRef.current = setTimeout(() => setValidationErrors([]), 8000);
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) stageFiles(files);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) stageFiles(files);
    // Reset input so same files can be re-added after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Simulate upload with per-file progress bars, then jump to step 4
  const startUpload = () => {
    if (stagedFiles.length === 0 || isUploading) return;
    setIsUploading(true);

    const pending = [...stagedFiles];

    // Initialise all files as uploading at 0%
    const initial: UploadingFile[] = pending.map((sf) => ({
      id: sf.id,
      file: sf.file,
      progress: 0,
      status: "uploading",
    }));
    setUploadingFiles(initial);

    const uploadResults: UploadResult[] = [];
    let finishedCount = 0;

    pending.forEach((sf) => {
      const willSucceed = Math.random() > 0.1;
      let progress = 0;

      const interval = setInterval(() => {
        // Random increment, bigger jumps early, slower near the end
        const remaining = 100 - progress;
        const increment = Math.random() * Math.min(remaining * 0.4, 25);
        progress = Math.min(progress + increment, willSucceed ? 99 : 72); // failed ones stall

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === sf.id ? { ...f, progress: Math.round(progress) } : f,
          ),
        );
      }, 250);

      // Finish after random duration
      const duration = 1500 + Math.random() * 2000;
      setTimeout(() => {
        clearInterval(interval);
        const status: "completed" | "failed" = willSucceed
          ? "completed"
          : "failed";

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === sf.id
              ? { ...f, progress: willSucceed ? 100 : f.progress, status }
              : f,
          ),
        );

        uploadResults.push({ id: sf.id, file: sf.file, status });

        if (willSucceed) {
          const now = new Date();
          const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          setHistory((prev) => [
            {
              id: Date.now() + Math.random(),
              name: sf.file.name,
              type: currentConfig?.label ?? "未知",
              size: formatSize(sf.file.size),
              status: "completed",
              time: timeStr,
              user: "admin",
            },
            ...prev,
          ]);
        }

        finishedCount++;
        if (finishedCount === pending.length) {
          // Small delay so user sees 100% before jumping
          setTimeout(() => {
            setResults(uploadResults);
            setIsUploading(false);
            setStep(4);
          }, 600);
        }
      }, duration);
    });
  };

  const resetAll = () => {
    setStagedFiles([]);
    setResults([]);
    setUploadingFiles([]);
    setValidationErrors([]);
    setIsUploading(false);
    setStep(1);
    setCategory(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goUploadAgain = () => {
    setStagedFiles([]);
    setResults([]);
    setUploadingFiles([]);
    setValidationErrors([]);
    setIsUploading(false);
    setStep(3);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const successCount = results.filter((r) => r.status === "completed").length;
  const failCount = results.filter((r) => r.status === "failed").length;
  const allSuccess = failCount === 0 && results.length > 0;

  // Step labels for stepper
  const steps: [string, string][] = [
    ["1", "選擇類型"],
    ["2", "選擇子類型"],
    ["3", "上傳檔案"],
    ["4", "上傳結果"],
  ];

  return (
    <div>
      <Header title="資料上傳" subtitle="光達與無人機資料上傳管理" />

      {/* Stepper */}
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

      {/* ── Step 1: 選擇大類 ── */}
      {step === 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {(
            [
              [
                "lidar",
                "光達資料",
                "LiDAR",
                "點雲、風場、大氣邊界層等光達量測資料",
              ],
              [
                "uav",
                "無人機資料",
                "UAV",
                "感測器、飛行軌跡、影像、氣象等無人機資料",
              ],
            ] as [DataCategory, string, string, string][]
          ).map(([val, title, eng, desc]) => (
            <div
              key={val}
              onClick={() => {
                setCategory(val);
                setStep(2);
              }}
              onMouseEnter={() => setHoveredCategory(val)}
              onMouseLeave={() => setHoveredCategory(null)}
              style={{
                padding: "32px 28px",
                borderRadius: 16,
                cursor: "pointer",
                border: `2px solid ${category === val || hoveredCategory === val ? "#6abe74" : "rgba(106,190,116,0.25)"}`,
                backgroundColor:
                  category === val
                    ? "rgba(106,190,116,0.08)"
                    : hoveredCategory === val
                      ? "rgba(106,190,116,0.05)"
                      : "#fff",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                transform:
                  hoveredCategory === val ? "translateY(-2px)" : "none",
                boxShadow:
                  hoveredCategory === val
                    ? "0 6px 20px rgba(106,190,116,0.15)"
                    : "none",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "rgba(106,190,116,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {val === "lidar" ? (
                  <Wind size={24} color="#6abe74" />
                ) : (
                  <Plane size={24} color="#6abe74" />
                )}
              </div>
              <div>
                <div
                  style={{ fontSize: 17, fontWeight: 700, color: "#374151" }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6abe74",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  {eng}
                </div>
                <div
                  style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}
                >
                  {desc}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#6abe74",
                  fontSize: 13,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                選擇 <ChevronRight size={15} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Step 2: 選擇子類型 ── */}
      {step === 2 && category && (
        <Card style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 16,
            }}
          >
            選擇{category === "lidar" ? "光達" : "無人機"}資料子類型
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(category === "lidar"
              ? (Object.entries(lidarConfig) as [
                  LidarSubType,
                  (typeof lidarConfig)[LidarSubType],
                ][])
              : (Object.entries(uavConfig) as [
                  UAVSubType,
                  (typeof uavConfig)[UAVSubType],
                ][])
            ).map(([key, cfg]) => {
              const selected =
                category === "lidar" ? lidarType === key : uavType === key;
              return (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 12,
                    cursor: "pointer",
                    border: `1.5px solid ${selected ? "#6abe74" : "rgba(106,190,116,0.2)"}`,
                    backgroundColor: selected
                      ? "rgba(106,190,116,0.07)"
                      : "#fff",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="subtype"
                    value={key}
                    checked={selected}
                    onChange={() =>
                      category === "lidar"
                        ? setLidarType(key as LidarSubType)
                        : setUavType(key as UAVSubType)
                    }
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: 0,
                      height: 0,
                    }}
                  />
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      flexShrink: 0,
                      border: `2px solid ${selected ? "#6abe74" : "#d1d5db"}`,
                      backgroundColor: selected ? "#6abe74" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {selected && (
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
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      {cfg.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        marginTop: 2,
                        display: "flex",
                        gap: 16,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <FileText size={11} /> {cfg.formats}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Package size={11} /> 最大 {cfg.maxSize}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 20,
            }}
          >
            <button
              onClick={() => setStep(1)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                backgroundColor: "transparent",
                fontSize: 13,
                color: "#6b7280",
                cursor: "pointer",
              }}
            >
              <ChevronLeft size={15} /> 上一步
            </button>
            <button
              onClick={() => setStep(3)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#6abe74",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              下一步 <ChevronRight size={15} />
            </button>
          </div>
        </Card>
      )}

      {/* ── Step 3: 選擇檔案（手動確認才上傳） ── */}
      {step === 3 && currentConfig && (
        <Card style={{ marginBottom: 20 }}>
          {/* 已選摘要 */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
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
            <span style={{ fontWeight: 600, color: "#374151" }}>
              {category === "lidar" ? "光達資料" : "無人機資料"} ›{" "}
              {currentConfig.label}
            </span>
            <span>·</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <FileText size={11} />
              {currentConfig.formats}
            </span>
            <span>·</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Package size={11} />
              最大 {currentConfig.maxSize}
            </span>
            {!isUploading && (
              <button
                onClick={() => setStep(2)}
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "#6abe74",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                修改
              </button>
            )}
          </div>

          {/* 拖放區 — 上傳進行中時隱藏 */}
          {!isUploading && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
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
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
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
                  onClick={() => setValidationErrors([])}
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
                      backgroundColor:
                        err.reason === "size"
                          ? "rgba(251,191,36,0.15)"
                          : "rgba(239,68,68,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: err.reason === "size" ? "#d97706" : "#ef4444",
                    }}
                  >
                    {err.reason === "size" ? "大" : "格"}
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
                  onClick={() => setStagedFiles([])}
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
                      onClick={() => removeStagedFile(sf.id)}
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
              marginTop: 20,
            }}
          >
            {!isUploading ? (
              <button
                onClick={() => {
                  setStagedFiles([]);
                  setStep(2);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  backgroundColor: "transparent",
                  fontSize: 13,
                  color: "#6b7280",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={15} /> 上一步
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={startUpload}
              disabled={stagedFiles.length === 0 || isUploading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                backgroundColor:
                  stagedFiles.length === 0 || isUploading
                    ? "#d1d5db"
                    : "#6abe74",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  stagedFiles.length === 0 || isUploading
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
      )}

      {/* ── Step 4: 上傳結果 ── */}
      {step === 4 && (
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
              onClick={goUploadAgain}
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
              onClick={resetAll}
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
      )}

      {/* ── 歷史記錄 ── */}
      <Card>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 16,
          }}
        >
          上傳歷史記錄
        </h3>
        <div className="table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                {[
                  "檔案名稱",
                  "資料類型",
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
              {history.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                >
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
                  <td style={{ padding: "12px", fontSize: 13, color: "#666" }}>
                    {r.type}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#666" }}>
                    {r.size}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#666" }}>
                    {r.user}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#666" }}>
                    {r.time}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
