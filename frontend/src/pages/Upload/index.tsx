import {
  useEffect,
  useState,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import * as XLSX from "xlsx";
import Header from "../../components/Layout/Header";
import { useAppData } from "../../contexts/AppDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { uploadService } from "../../services/uploadService";
import { useUploadProgress } from "../../hooks/useUploadProgress";
import { isDemoMode } from "../../config/api";
import { BatchDeleteDialog, ExportDialog } from "./UploadDialogs";
import UploadHistorySection from "./UploadHistorySection";
import {
  FileUploadSection,
  StationSelectSection,
  UploadResultSection,
  UploadStepper,
} from "./UploadStepSections";
import {
  ALLOWED_EXTS,
  STATION_SLUGS,
  formatHistoryTime,
  formatSize,
  formatStation,
  repairMojibakeText,
  type PageSizeOption,
  type StagedFile,
  type StationOption,
  type UploadResult,
  type UploadingFile,
  type ValidationError,
} from "./uploadHelpers";

export default function Upload() {
  const { uploadHistory: history, setUploadHistory: setHistory } = useAppData();
  const { token, user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationOption | "">(
    "",
  );
  const [hoveredStation, setHoveredStation] = useState<StationOption | "">("");
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
  const [historyDeleteError, setHistoryDeleteError] = useState<string | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const errTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadIdMapRef = useRef<Map<number, { id: string; file: File }>>(
    new Map(),
  );
  const finishedCountRef = useRef(0);
  const totalCountRef = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);


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
            size: formatSize(record.fileSize),
            status:
              record.uploadStatus === "completed"
                ? "completed"
                : record.uploadStatus === "failed"
                  ? "failed"
                  : "processing",
            time: formatHistoryTime(record.createdAt),
            user: record.username ?? user?.username ?? "admin",
            station: formatStation(record.station),
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
    const errors: ValidationError[] = [];
    const accepted: StagedFile[] = [];

    for (const f of files) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        errors.push({
          fileName: f.name,
          reason: "ext",
          detail: `不支援的格式（${ext}），僅接受 ${ALLOWED_EXTS.join(", ")}`,
        });
      } else {
        const isDuplicate = stagedFiles.some(
          (sf) => sf.file.name === f.name && sf.file.size === f.size,
        );
        if (isDuplicate) {
          errors.push({
            fileName: f.name,
            reason: "dup",
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
            size: formatSize(info.file.size),
            status: "completed",
            time: timeStr,
            user: user?.username ?? "admin",
            station: selectedStation || undefined,
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
            setStep(3);
            setActiveUploadIds([]);
          }, 600);
          return prev;
        });
      }
    }
  });

  // Submit real upload request, then track progress from backend SSE
  const startUpload = async () => {
    if (stagedFiles.length === 0 || isUploading) return;
    if (!selectedStation) {
      setUploadError("請先選擇測站。");
      return;
    }
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
                size: formatSize(sf.file.size),
                status: "completed",
                time: timeStr,
                user: user?.username ?? "demo",
                station: selectedStation || undefined,
              },
              ...prev,
            ]);
          }

          finishedCount += 1;
          if (finishedCount === pending.length) {
            setTimeout(() => {
              setResults(uploadResults);
              setIsUploading(false);
              setStep(3);
            }, 600);
          }
        }, duration);
      });

      return;
    }

    try {
      const response = await uploadService.uploadFiles(
        pending.map((sf) => sf.file),
        authToken,
        STATION_SLUGS[selectedStation as StationOption],
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
    }
  };

  const resetAll = () => {
    setStagedFiles([]);
    setSelectedStation("");
    setResults([]);
    setUploadingFiles([]);
    setValidationErrors([]);
    setIsUploading(false);
    setStep(1);
    setUploadError(null);
    uploadIdMapRef.current.clear();
    finishedCountRef.current = 0;
    totalCountRef.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goUploadAgain = () => {
    setStagedFiles([]);
    setSelectedStation("");
    setResults([]);
    setUploadingFiles([]);
    setValidationErrors([]);
    setIsUploading(false);
    setStep(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || isBatchDeleting) return;
    const ids = Array.from(selectedIds);

    if (isDemoMode) {
      setHistory((prev) =>
        prev.filter((item) => !ids.includes(item.id as number)),
      );
      setSelectedIds(new Set());
      setShowBatchDeleteDialog(false);
      return;
    }

    if (!token) {
      setHistoryDeleteError("尚未登入，請重新登入後再刪除。");
      return;
    }

    setIsBatchDeleting(true);
    setHistoryDeleteError(null);
    try {
      await Promise.all(
        ids.map((id) => uploadService.deleteHistoryRecord(id, token)),
      );
      setHistory((prev) =>
        prev.filter((item) => !ids.includes(item.id as number)),
      );
      setSelectedIds(new Set());
      setShowBatchDeleteDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "刪除失敗";
      setHistoryDeleteError(message);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const exportSelectedToExcel = () => {
    const STATUS_LABEL: Record<string, string> = {
      completed: "完成",
      failed: "失敗",
      processing: "處理中",
    };

    const selectedRows = paginatedHistory.filter((r) =>
      selectedIds.has(r.id as number),
    );

    const data = selectedRows.map((r) => ({
      檔案名稱: r.name,
      測站: r.station ?? "—",
      檔案大小: r.size,
      上傳者: r.user,
      上傳時間: r.time,
      狀態: STATUS_LABEL[r.status] ?? r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // 欄寬
    ws["!cols"] = [40, 10, 12, 14, 18, 10].map((wch) => ({ wch }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "上傳歷史");

    // 檔名用台北時間
    const now = new Date();
    const ts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .format(now)
      .replace(/[-: ]/g, "")
      .slice(0, 15);

    XLSX.writeFile(wb, `upload_history_${ts}.xlsx`);
  };

  const toggleSelectAll = () => {
    const selectableIds = paginatedHistory
      .filter((r) => r.status !== "processing")
      .map((r) => r.id as number);
    const allSelected = selectableIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...selectableIds]));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  // Reset selection when page/filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [historySearchKeyword, historyPageSize, historyCurrentPage]);

  const normalizedHistoryKeyword = historySearchKeyword.trim().toLowerCase();
  const filteredHistory = history.filter((record) => {
    if (!normalizedHistoryKeyword) return true;

    return [record.name, record.user, record.station ?? ""].some((field) =>
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


  return (
    <div>
      <Header title="資料上傳" subtitle="依測站上傳 UAV 檔案" />

      <UploadStepper step={step} />

      {step === 1 && (
        <StationSelectSection
          selectedStation={selectedStation}
          hoveredStation={hoveredStation}
          onSelectStation={setSelectedStation}
          onHoverStation={setHoveredStation}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <FileUploadSection
          selectedStation={selectedStation}
          isDragging={isDragging}
          isUploading={isUploading}
          stagedFiles={stagedFiles}
          uploadingFiles={uploadingFiles}
          validationErrors={validationErrors}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onDraggingChange={setIsDragging}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          onClearValidationErrors={() => setValidationErrors([])}
          onClearStagedFiles={() => setStagedFiles([])}
          onRemoveStagedFile={removeStagedFile}
          onBack={() => setStep(1)}
          onStartUpload={startUpload}
        />
      )}

      {step === 3 && (
        <UploadResultSection
          results={results}
          onUploadAgain={goUploadAgain}
          onResetAll={resetAll}
        />
      )}

      <UploadHistorySection
        historySearchKeyword={historySearchKeyword}
        historyPageSize={historyPageSize}
        historyCurrentPage={historyCurrentPage}
        historyTotalPages={historyTotalPages}
        historyStartIndex={historyStartIndex}
        historyEndIndex={historyEndIndex}
        filteredHistoryLength={filteredHistory.length}
        paginatedHistory={paginatedHistory}
        selectedIds={selectedIds}
        setHistoryCurrentPage={setHistoryCurrentPage}
        onSearchChange={setHistorySearchKeyword}
        onPageSizeChange={setHistoryPageSize}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelectOne={toggleSelectOne}
        onClearSelection={() => setSelectedIds(new Set())}
        onOpenExportDialog={() => setShowExportDialog(true)}
        onOpenBatchDeleteDialog={() => {
          setHistoryDeleteError(null);
          setShowBatchDeleteDialog(true);
        }}
      />

      <ExportDialog
        open={showExportDialog}
        selectedCount={selectedIds.size}
        onClose={() => setShowExportDialog(false)}
        onConfirm={() => {
          exportSelectedToExcel();
          setShowExportDialog(false);
        }}
      />

      <BatchDeleteDialog
        open={showBatchDeleteDialog}
        selectedCount={selectedIds.size}
        error={historyDeleteError}
        isDeleting={isBatchDeleting}
        onClose={() => {
          setShowBatchDeleteDialog(false);
          setHistoryDeleteError(null);
        }}
        onConfirm={handleBatchDelete}
      />
    </div>
  );
}