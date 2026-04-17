import {
  useEffect,
  useState,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import Select from "react-select";
import type { StylesConfig } from "react-select";
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
import { useAuth } from "../../contexts/AuthContext";
import { uploadService } from "../../services/uploadService";
import { useUploadProgress } from "../../hooks/useUploadProgress";
import { isDemoMode } from "../../config/api";

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

const DATA_TYPE_LABELS: Record<string, string> = {
  point_cloud: "點雲資料",
  wind_field: "風場資料",
  boundary_layer: "大氣邊界層",
  sensor: "感測器資料",
  flight_path: "飛行軌跡",
  imagery: "影像資料",
  meteorological: "氣象資料",
};

function repairMojibakeText(value: string): string {
  const suspicious = /[ÃÂÄÅÆÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÜàáâãäåæèéêëìíîïòóôõùúûü�]/.test(
    value,
  );
  if (!suspicious) return value;

  try {
    const repaired = decodeURIComponent(escape(value));
    return repaired !== value ? repaired : value;
  } catch {
    return value;
  }
}

function parseHistoryDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(value.trim().replace(" ", "T"));
}

function formatHistoryTime(value: string | Date): string {
  const date = parseHistoryDate(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function getHistoryDataTypeLabel(
  dataCategory: string,
  dataType: string,
): string {
  return (
    DATA_TYPE_LABELS[dataType] ??
    (dataCategory === "lidar"
      ? "光達資料"
      : dataCategory === "uav"
        ? "無人機資料"
        : dataType)
  );
}

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
  uploadId: number;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "failed";
}

interface UploadResult {
  id: string;
  file: File;
  status: "completed" | "failed";
}

type PageSizeOption = 10 | 30 | 50 | 100 | 200 | "All";

const PAGE_SIZE_OPTIONS: PageSizeOption[] = [10, 30, 50, 100, 200, "All"];

interface PageSizeSelectOption {
  value: PageSizeOption;
  label: string;
}

const historyPageSizeOptions: PageSizeSelectOption[] = PAGE_SIZE_OPTIONS.map(
  (option) => ({
    value: option,
    label: option === "All" ? "All" : `${option} 筆`,
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

export default function Upload() {
  const { uploadHistory: history, setUploadHistory: setHistory } = useAppData();
  const { token, user } = useAuth();
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
  const [activeUploadIds, setActiveUploadIds] = useState<number[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [historySearchKeyword, setHistorySearchKeyword] = useState("");
  const [historyPageSize, setHistoryPageSize] = useState<PageSizeOption>(10);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyDeleteTarget, setHistoryDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [historyDeletingId, setHistoryDeletingId] = useState<number | null>(
    null,
  );
  const [historyDeleteError, setHistoryDeleteError] = useState<string | null>(
    null,
  );
  const errTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadIdMapRef = useRef<Map<number, { id: string; file: File }>>(
    new Map(),
  );
  const finishedCountRef = useRef(0);
  const totalCountRef = useRef(0);

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

  const currentConfigRef = useRef(currentConfig);

  useEffect(() => {
    currentConfigRef.current = currentConfig;
  }, [currentConfig]);

  function formatSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  useEffect(() => {
    if (isDemoMode || !token) return;

    let cancelled = false;
    uploadService
      .getHistory(token, { page: "1", limit: "50" })
      .then((res) => {
        if (cancelled) return;

        setHistory(
          res.records.map((record) => ({
            id: record.uploadId,
            name: repairMojibakeText(record.fileName),
            type: getHistoryDataTypeLabel(record.dataCategory, record.dataType),
            size: formatSize(record.fileSize),
            status:
              record.uploadStatus === "completed"
                ? "completed"
                : record.uploadStatus === "failed"
                  ? "failed"
                  : "processing",
            time: formatHistoryTime(record.createdAt),
            user: user?.username ?? "admin",
          })),
        );
      })
      .catch(() => {
        // Keep the seeded mock history if the backend is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [token, setHistory, user?.username]);

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

  useUploadProgress(isDemoMode ? [] : activeUploadIds, token, (event) => {
    const info = uploadIdMapRef.current.get(event.uploadId);
    if (!info) return;

    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.uploadId === event.uploadId
          ? {
              ...f,
              progress: event.progress,
              status: event.status === "cancelled" ? "failed" : event.status,
            }
          : f,
      ),
    );

    if (
      event.status === "completed" ||
      event.status === "failed" ||
      event.status === "cancelled"
    ) {
      if (event.status === "completed") {
        const now = new Date();
        const timeStr = formatHistoryTime(now);
        setHistory((prev) => [
          {
            id: event.uploadId,
            name: repairMojibakeText(info.file.name),
            type: currentConfigRef.current?.label ?? "未知",
            size: formatSize(info.file.size),
            status: "completed",
            time: timeStr,
            user: user?.username ?? "admin",
          },
          ...prev,
        ]);
      }

      finishedCountRef.current += 1;
      if (finishedCountRef.current >= totalCountRef.current) {
        setUploadingFiles((prev) => {
          const finalResults: UploadResult[] = prev.map((f) => ({
            id: f.id,
            file: f.file,
            status: f.status === "completed" ? "completed" : "failed",
          }));
          setTimeout(() => {
            setResults(finalResults);
            setIsUploading(false);
            setStep(4);
            setActiveUploadIds([]);
          }, 600);
          return prev;
        });
      }
    }
  });

  // Submit real upload request, then track progress from backend SSE
  const startUpload = async () => {
    if (stagedFiles.length === 0 || isUploading || !category) return;
    const authToken = token ?? "";
    if (!isDemoMode && !authToken) {
      setUploadError("尚未登入，請先重新登入後再上傳。");
      return;
    }
    setIsUploading(true);
    setUploadError(null);

    const pending = [...stagedFiles];

    // Initialise all files as uploading at 0%
    const initial: UploadingFile[] = pending.map((sf) => ({
      id: sf.id,
      uploadId: 0,
      file: sf.file,
      progress: 0,
      status: "uploading",
    }));
    setUploadingFiles(initial);
    setStep(3);

    if (isDemoMode) {
      const uploadResults: UploadResult[] = [];
      let finishedCount = 0;

      pending.forEach((sf) => {
        const willSucceed = Math.random() > 0.1;
        let progress = 0;

        const interval = setInterval(() => {
          const remaining = 100 - progress;
          const increment = Math.random() * Math.min(remaining * 0.4, 25);
          progress = Math.min(progress + increment, willSucceed ? 99 : 72);

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === sf.id ? { ...f, progress: Math.round(progress) } : f,
            ),
          );
        }, 250);

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
            const timeStr = formatHistoryTime(now);
            setHistory((prev) => [
              {
                id: Date.now() + Math.random(),
                name: repairMojibakeText(sf.file.name),
                type: currentConfigRef.current?.label ?? "未知",
                size: formatSize(sf.file.size),
                status: "completed",
                time: timeStr,
                user: user?.username ?? "demo",
              },
              ...prev,
            ]);
          }

          finishedCount += 1;
          if (finishedCount === pending.length) {
            setTimeout(() => {
              setResults(uploadResults);
              setIsUploading(false);
              setStep(4);
            }, 600);
          }
        }, duration);
      });

      return;
    }

    const dataType = category === "lidar" ? lidarType : uavType;

    try {
      const response = await uploadService.uploadFiles(
        pending.map((sf) => sf.file),
        category,
        dataType,
        authToken,
      );

      const ids = response.uploadIds;
      uploadIdMapRef.current.clear();
      finishedCountRef.current = 0;
      totalCountRef.current = ids.length;

      setUploadingFiles((prev) =>
        prev.map((f, i) => ({
          ...f,
          uploadId: ids[i] ?? 0,
        })),
      );

      pending.forEach((sf, i) => {
        if (ids[i] != null) {
          uploadIdMapRef.current.set(ids[i], { id: sf.id, file: sf.file });
        }
      });

      setActiveUploadIds(ids);
    } catch (err: unknown) {
      const e = err as Error & {
        details?: { fileName: string; reason: string; detail: string }[];
      };
      setUploadError(e.message ?? "上傳失敗");

      if (e.details?.length) {
        setValidationErrors(
          e.details.map((d) => ({
            fileName: d.fileName,
            reason: "ext" as const,
            detail: d.detail,
          })),
        );
      }

      setUploadingFiles((prev) =>
        prev.map((f) => ({ ...f, status: "failed" })),
      );
      setIsUploading(false);
      setStep(3);
    }
  };

  const resetAll = () => {
    setStagedFiles([]);
    setResults([]);
    setUploadingFiles([]);
    setValidationErrors([]);
    setIsUploading(false);
    setStep(1);
    setCategory(null);
    setActiveUploadIds([]);
    setUploadError(null);
    uploadIdMapRef.current.clear();
    finishedCountRef.current = 0;
    totalCountRef.current = 0;
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

  const closeDeleteDialog = () => {
    if (historyDeletingId !== null) return;
    setHistoryDeleteTarget(null);
    setHistoryDeleteError(null);
  };

  const handleDeleteHistoryRecord = async () => {
    if (!historyDeleteTarget || historyDeletingId !== null) return;

    if (isDemoMode) {
      setHistory((prev) =>
        prev.filter((item) => item.id !== historyDeleteTarget.id),
      );
      setHistoryDeleteTarget(null);
      setHistoryDeleteError(null);
      return;
    }

    if (!token) {
      setHistoryDeleteError("尚未登入，請重新登入後再刪除。");
      return;
    }

    setHistoryDeleteError(null);
    setHistoryDeletingId(historyDeleteTarget.id);
    try {
      await uploadService.deleteHistoryRecord(historyDeleteTarget.id, token);
      setHistory((prev) =>
        prev.filter((item) => item.id !== historyDeleteTarget.id),
      );
      setHistoryDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "刪除歷史記錄失敗";
      setHistoryDeleteError(message);
    } finally {
      setHistoryDeletingId(null);
    }
  };

  const successCount = results.filter((r) => r.status === "completed").length;
  const failCount = results.filter((r) => r.status === "failed").length;
  const allSuccess = failCount === 0 && results.length > 0;

  const normalizedHistoryKeyword = historySearchKeyword.trim().toLowerCase();
  const filteredHistory = history.filter((record) => {
    if (!normalizedHistoryKeyword) return true;

    return [record.name, record.type, record.user].some((field) =>
      field.toLowerCase().includes(normalizedHistoryKeyword),
    );
  });

  const historyTotalPages =
    historyPageSize === "All"
      ? 1
      : Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));

  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [historySearchKeyword, historyPageSize]);

  useEffect(() => {
    setHistoryCurrentPage((prev) => Math.min(prev, historyTotalPages));
  }, [historyTotalPages]);

  const paginatedHistory =
    historyPageSize === "All"
      ? filteredHistory
      : filteredHistory.slice(
          (historyCurrentPage - 1) * historyPageSize,
          historyCurrentPage * historyPageSize,
        );

  const historyStartIndex =
    filteredHistory.length === 0
      ? 0
      : historyPageSize === "All"
        ? 1
        : (historyCurrentPage - 1) * historyPageSize + 1;

  const historyEndIndex =
    filteredHistory.length === 0
      ? 0
      : historyPageSize === "All"
        ? filteredHistory.length
        : Math.min(
            historyCurrentPage * historyPageSize,
            filteredHistory.length,
          );

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 24,
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
              onChange={(e) => setHistorySearchKeyword(e.target.value)}
              placeholder="搜尋檔案名稱、資料類型、上傳者"
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
                onChange={(option) => setHistoryPageSize(option?.value ?? 10)}
                styles={historySelectStyles}
                isSearchable={false}
              />
            </div>
          </div>
        </div>
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
                paginatedHistory.map((r) => (
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
                    <td
                      style={{ padding: "12px", fontSize: 13, color: "#666" }}
                    >
                      {r.type}
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
                    <td style={{ padding: "12px" }}>
                      <button
                        onClick={() => {
                          setHistoryDeleteError(null);
                          setHistoryDeleteTarget({ id: r.id, name: r.name });
                        }}
                        disabled={
                          r.status === "processing" ||
                          historyDeletingId === r.id
                        }
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(239,68,68,0.35)",
                          backgroundColor: "transparent",
                          color:
                            r.status === "processing" ? "#9ca3af" : "#ef4444",
                          fontSize: 12,
                          cursor:
                            r.status === "processing" ||
                            historyDeletingId === r.id
                              ? "not-allowed"
                              : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title={
                          r.status === "processing"
                            ? "上傳進行中，暫時無法刪除"
                            : "刪除這筆資料"
                        }
                      >
                        <Trash2 size={13} />
                        {historyDeletingId === r.id ? "刪除中" : "刪除"}
                      </button>
                    </td>
                  </tr>
                ))
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
            {filteredHistory.length} 筆
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

      {historyDeleteTarget && (
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
          onClick={closeDeleteDialog}
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
              確認刪除上傳資料
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                lineHeight: 1.6,
              }}
            >
              你即將刪除這筆上傳歷史記錄，刪除後將同步移除資料庫紀錄與檔案，且無法復原。
            </div>
            <div
              style={{
                marginTop: 10,
                padding: "8px 10px",
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(0,0,0,0.08)",
                fontSize: 12,
                color: "#374151",
                wordBreak: "break-all",
              }}
            >
              {historyDeleteTarget.name}
            </div>

            {historyDeleteError && (
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
                {historyDeleteError}
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
                onClick={closeDeleteDialog}
                disabled={historyDeletingId !== null}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.14)",
                  backgroundColor: "transparent",
                  color: "#6b7280",
                  fontSize: 13,
                  cursor:
                    historyDeletingId !== null ? "not-allowed" : "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={handleDeleteHistoryRecord}
                disabled={historyDeletingId !== null}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor:
                    historyDeletingId !== null ? "#fca5a5" : "#ef4444",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    historyDeletingId !== null ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Trash2 size={14} />
                {historyDeletingId !== null ? "刪除中..." : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
