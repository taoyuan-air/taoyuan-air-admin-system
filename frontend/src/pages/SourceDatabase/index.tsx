import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import Card from "../../components/Card";
import Header from "../../components/Layout/Header";
import { apiUrl, isDemoMode } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { uploadService } from "../../services/uploadService";
import SourceDatabaseDialogs from "./SourceDatabaseDialogs";
import SourceDatabaseTable from "./SourceDatabaseTable";
import SourceDatabaseToolbar from "./SourceDatabaseToolbar";
import {
  DATA_TYPE_LABELS,
  MOCK_RECORDS,
  STATION_LABELS,
  type DbRecord,
  type PageSizeOption,
  formatSize,
  formatTime,
} from "./sourceDatabaseHelpers";

export default function SourceDatabase() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [allRecords, setAllRecords] = useState<DbRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isSftp = ["naqo", "windlidar", "mpl"].includes(category ?? "");
  const categoryLabel = {
    uav: "無人機資料系統",
    naqo: "NAQO 中大空品站",
    windlidar: "WindLidar 風廓線光達",
    mpl: "MPL 微脈衝光達",
  }[category ?? ""] ?? category;

  const fetchAll = useCallback(async () => {
    if (!category) return;
    if (isDemoMode) {
      setAllRecords(MOCK_RECORDS[category] ?? []);
      return;
    }
    setLoading(true);
    try {
      const isSftpCategory = ["naqo", "windlidar", "mpl"].includes(category);
      const url = isSftpCategory
        ? apiUrl(`/api/sftp/records/${category}?page=1&limit=9999`)
        : apiUrl("/api/uploads/history?all=true&page=1&limit=9999");
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllRecords(data.records ?? []);
    } finally {
      setLoading(false);
    }
  }, [category, token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [keyword, pageSize]);

  const filtered = allRecords.filter((record) => {
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    const stationLabel = STATION_LABELS[record.station ?? ""] ?? record.station ?? "";
    const typeLabel = record.dataType ? DATA_TYPE_LABELS[record.dataType] ?? record.dataType : "";
    return [record.fileName, stationLabel, typeLabel, record.username ?? ""].some((field) => field.toLowerCase().includes(kw));
  });

  const totalPages = pageSize === "All" ? 1 : Math.max(1, Math.ceil(filtered.length / (pageSize as number)));
  const paginated = pageSize === "All"
    ? filtered
    : filtered.slice((currentPage - 1) * (pageSize as number), currentPage * (pageSize as number));

  const startIdx = filtered.length === 0 ? 0 : pageSize === "All" ? 1 : (currentPage - 1) * (pageSize as number) + 1;
  const endIdx = filtered.length === 0 ? 0 : pageSize === "All" ? filtered.length : Math.min(currentPage * (pageSize as number), filtered.length);

  const selectableIds = paginated.filter((record) => record.uploadStatus !== "uploading").map((record) => record.uploadId);
  const checkedCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const isAllSelected = selectableIds.length > 0 && checkedCount === selectableIds.length;
  const isIndeterminate = checkedCount > 0 && !isAllSelected;

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeleteError(null);
  };

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    setSelectedIds((prev) => new Set([...prev, ...selectableIds]));
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    if (isDemoMode) {
      setAllRecords((prev) => prev.filter((record) => !ids.includes(record.uploadId)));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      return;
    }
    if (!token) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await Promise.all(ids.map((id) => uploadService.deleteHistoryRecord(id, token)));
      setAllRecords((prev) => prev.filter((record) => !ids.includes(record.uploadId)));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const STATUS_LABEL: Record<string, string> = { completed: "完成", failed: "失敗", uploading: "上傳中", cancelled: "已取消" };
    const rows = allRecords
      .filter((record) => selectedIds.has(record.uploadId))
      .map((record) => ({
        檔案名稱: record.fileName,
        ...(isSftp
          ? { 資料類型: record.dataType ? DATA_TYPE_LABELS[record.dataType] ?? record.dataType : "-" }
          : { 測站: STATION_LABELS[record.station ?? ""] ?? record.station ?? "-" }),
        檔案大小: formatSize(record.fileSize),
        上傳者: record.username ?? "-",
        上傳時間: formatTime(record.createdAt),
        狀態: STATUS_LABEL[record.uploadStatus] ?? record.uploadStatus,
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [40, 16, 12, 14, 18, 10].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, categoryLabel ?? category ?? "資料");
    const ts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date()).replace(/[-: ]/g, "").slice(0, 15);
    XLSX.writeFile(wb, `${category}_records_${ts}.xlsx`);
    setShowExportDialog(false);
  };

  return (
    <div>
      <Header
        title={`${categoryLabel} — 資料庫內容`}
        subtitle={`共 ${allRecords.length} 筆資料`}
      />

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => navigate("/data-sources")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid rgba(106,190,116,0.4)",
            backgroundColor: "transparent",
            color: "#6abe74",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={14} /> 返回資料來源
        </button>
      </div>

      <Card>
        <SourceDatabaseToolbar
          categoryLabel={categoryLabel}
          isSftp={isSftp}
          keyword={keyword}
          pageSize={pageSize}
          selectedCount={selectedIds.size}
          onKeywordChange={setKeyword}
          onPageSizeChange={setPageSize}
          onOpenExportDialog={() => setShowExportDialog(true)}
          onOpenDeleteDialog={() => {
            setDeleteError(null);
            setShowDeleteDialog(true);
          }}
          onClearSelection={() => setSelectedIds(new Set())}
        />

        <SourceDatabaseTable
          loading={loading}
          records={paginated}
          filteredCount={filtered.length}
          keyword={keyword}
          isSftp={isSftp}
          selectedIds={selectedIds}
          selectableIds={selectableIds}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          startIdx={startIdx}
          endIdx={endIdx}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onPageChange={setCurrentPage}
        />
      </Card>

      <SourceDatabaseDialogs
        showExportDialog={showExportDialog}
        showDeleteDialog={showDeleteDialog}
        selectedCount={selectedIds.size}
        isDeleting={isDeleting}
        deleteError={deleteError}
        onCloseExportDialog={() => setShowExportDialog(false)}
        onCloseDeleteDialog={closeDeleteDialog}
        onConfirmExport={handleExport}
        onConfirmDelete={handleDelete}
      />
    </div>
  );
}
