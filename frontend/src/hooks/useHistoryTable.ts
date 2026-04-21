import { useState, useEffect, useCallback, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { uploadService } from "../services/uploadService";
import { isDemoMode } from "../config/api";

export interface HistoryRow {
  id: number;
  name: string;
  type: string;
  size: string;
  status: "completed" | "processing" | "failed";
  time: string;
  user: string;
}

interface UseHistoryTableOptions {
  token: string | null;
  columns: ColumnDef<HistoryRow, unknown>[];
  /** Called after a successful delete so the parent can react if needed */
  onDeleted?: (ids: number[]) => void;
  /** Rows injected from outside (e.g. newly completed uploads) */
  prependedRows?: HistoryRow[];
}

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100, 200] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | "All";
export { PAGE_SIZE_OPTIONS };

// ── helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  point_cloud: "點雲資料",
  wind_field: "風場資料",
  boundary_layer: "大氣邊界層",
  sensor: "感測器資料",
  flight_path: "飛行軌跡",
  imagery: "影像資料",
  meteorological: "氣象資料",
};

function getTypeLabel(category: string, dataType: string): string {
  return (
    DATA_TYPE_LABELS[dataType] ??
    (category === "lidar"
      ? "光達資料"
      : category === "uav"
        ? "無人機資料"
        : dataType)
  );
}

function repairMojibake(value: string): string {
  if (!/[ÃÂÄÅÆÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÜàáâãäåæèéêëìíîïòóôõùúûü]/.test(value))
    return value;
  try {
    const r = decodeURIComponent(escape(value));
    return r !== value ? r : value;
  } catch {
    return value;
  }
}

function formatTime(value: string | Date): string {
  const date =
    value instanceof Date
      ? value
      : new Date(String(value).trim().replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const g = (t: Intl.DateTimeFormatPartTypes) =>
    p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useHistoryTable({
  token,
  columns,
  onDeleted,
  prependedRows = [],
}: UseHistoryTableOptions) {
  // server-side pagination state
  const [pageIndex, setPageIndex] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [totalCount, setTotalCount] = useState(0);

  // data
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // search (client-side filter on current page for demo; triggers refetch in real mode)
  const [keyword, setKeyword] = useState("");

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: "time", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // delete
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchPage = useCallback(async () => {
    if (isDemoMode || !token) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const params: Record<string, string> = {
        page: String(pageIndex + 1),
        limit: pageSize === "All" ? "9999" : String(pageSize),
      };
      if (keyword.trim()) params.search = keyword.trim();

      const res = await uploadService.getHistory(token, params);
      setTotalCount(res.total);
      setRows(
        res.records.map((r) => ({
          id: r.uploadId,
          name: repairMojibake(r.fileName),
          type: getTypeLabel(r.dataCategory, r.dataType),
          size: formatSize(r.fileSize),
          status:
            r.uploadStatus === "completed"
              ? "completed"
              : r.uploadStatus === "failed"
                ? "failed"
                : "processing",
          time: formatTime(r.createdAt),
          user: r.fileName, // overridden below — uploadService doesn't return uploader
        })),
      );
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setIsLoading(false);
    }
  }, [token, pageIndex, pageSize, keyword]);

  // refetch whenever pagination / search changes
  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // reset to page 0 when keyword or pageSize changes
  useEffect(() => {
    setPageIndex(0);
  }, [keyword, pageSize]);

  // reset selection when page changes
  useEffect(() => {
    setRowSelection({});
  }, [pageIndex, pageSize, keyword]);

  // ── prepended rows (newly uploaded, injected from parent) ──────────────────
  // Keep a ref so we can detect genuinely new entries
  const prependedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (prependedRows.length === 0) return;
    const newOnes = prependedRows.filter(
      (r) => !prependedIdsRef.current.has(r.id),
    );
    if (newOnes.length === 0) return;
    newOnes.forEach((r) => prependedIdsRef.current.add(r.id));

    if (isDemoMode) {
      // In demo mode we manage data locally
      setRows((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const toAdd = newOnes.filter((r) => !existingIds.has(r.id));
        return toAdd.length ? [...toAdd, ...prev] : prev;
      });
      setTotalCount((c) => c + newOnes.length);
    } else {
      // In real mode, refetch so server data is authoritative
      fetchPage();
    }
  }, [prependedRows, fetchPage]);

  // ── delete ─────────────────────────────────────────────────────────────────

  const selectedRowIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map(Number);

  const openDeleteDialog = () => {
    if (selectedRowIds.length === 0) return;
    setDeleteError(null);
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (isDeleting || selectedRowIds.length === 0) return;

    if (isDemoMode) {
      setRows((prev) => prev.filter((r) => !selectedRowIds.includes(r.id)));
      setTotalCount((c) => c - selectedRowIds.length);
      setRowSelection({});
      setShowDeleteDialog(false);
      onDeleted?.(selectedRowIds);
      return;
    }

    if (!token) {
      setDeleteError("尚未登入，請重新登入後再刪除。");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await Promise.all(
        selectedRowIds.map((id) =>
          uploadService.deleteHistoryRecord(id, token),
        ),
      );
      setRows((prev) => prev.filter((r) => !selectedRowIds.includes(r.id)));
      setTotalCount((c) => c - selectedRowIds.length);
      setRowSelection({});
      setShowDeleteDialog(false);
      onDeleted?.(selectedRowIds);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── TanStack Table instance ────────────────────────────────────────────────

  // For demo mode, apply client-side keyword filter + sorting
  const displayRows = isDemoMode
    ? (() => {
        const kw = keyword.trim().toLowerCase();
        const filtered = kw
          ? rows.filter((r) =>
              [r.name, r.type, r.user].some((f) =>
                f.toLowerCase().includes(kw),
              ),
            )
          : rows;

        if (sorting.length === 0) return filtered;
        const { id, desc } = sorting[0];
        return [...filtered].sort((a, b) => {
          const av = a[id as keyof HistoryRow] ?? "";
          const bv = b[id as keyof HistoryRow] ?? "";
          const cmp = String(av).localeCompare(String(bv));
          return desc ? -cmp : cmp;
        });
      })()
    : rows;

  const pageCount =
    pageSize === "All"
      ? 1
      : Math.max(1, Math.ceil((isDemoMode ? displayRows.length : totalCount) / (pageSize as number)));

  // For demo mode pagination
  const pagedRows =
    isDemoMode && pageSize !== "All"
      ? displayRows.slice(
          pageIndex * (pageSize as number),
          (pageIndex + 1) * (pageSize as number),
        )
      : isDemoMode
        ? displayRows
        : displayRows; // real mode: server already returned the right page

  const table = useReactTable({
    data: pagedRows,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: isDemoMode ? getSortedRowModel() : getCoreRowModel(),
    manualPagination: true,
    manualSorting: !isDemoMode,
    pageCount,
    enableRowSelection: (row) => row.original.status !== "processing",
    getRowId: (row) => String(row.id),
  });

  const totalDisplayCount = isDemoMode ? displayRows.length : totalCount;
  const startIndex =
    totalDisplayCount === 0
      ? 0
      : pageSize === "All"
        ? 1
        : pageIndex * (pageSize as number) + 1;
  const endIndex =
    totalDisplayCount === 0
      ? 0
      : pageSize === "All"
        ? totalDisplayCount
        : Math.min((pageIndex + 1) * (pageSize as number), totalDisplayCount);

  return {
    // table instance
    table,
    // pagination
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    pageCount,
    totalCount: totalDisplayCount,
    startIndex,
    endIndex,
    // search
    keyword,
    setKeyword,
    // loading
    isLoading,
    fetchError,
    refetch: fetchPage,
    // selection
    selectedRowIds,
    // delete
    showDeleteDialog,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    isDeleting,
    deleteError,
    // expose for parent to inject new rows
    setRows,
    setTotalCount,
  };
}
