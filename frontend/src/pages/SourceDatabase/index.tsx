import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, FileSpreadsheet, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import Card from '../../components/Card';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl, isDemoMode } from '../../config/api';
import { uploadService } from '../../services/uploadService';

interface DbRecord {
  uploadId: number;
  fileName: string;
  dataCategory: string;
  dataType: string;
  fileSize: number;
  uploadStatus: string;
  createdAt: string;
  username?: string;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  point_cloud: '點雲資料', wind_field: '風場資料', boundary_layer: '大氣邊界層',
  sensor: '感測器資料', flight_path: '飛行軌跡', imagery: '影像資料', meteorological: '氣象資料',
  hourly_obs: '逐時觀測',
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(value: string) {
  const date = new Date(value.trim().replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replace('T', ' ');
}

const MOCK_RECORDS: Record<string, DbRecord[]> = {
  lidar: [
    { uploadId: 1, fileName: 'lidar_20260401_001.las', dataCategory: 'lidar', dataType: 'point_cloud', fileSize: 256901120, uploadStatus: 'completed', createdAt: '2026-04-01T08:32:00', username: 'admin' },
    { uploadId: 3, fileName: 'wind_field_20260401.nc', dataCategory: 'lidar', dataType: 'wind_field', fileSize: 92274688, uploadStatus: 'completed', createdAt: '2026-04-01T07:50:00', username: 'admin' },
    { uploadId: 4, fileName: 'boundary_layer.json', dataCategory: 'lidar', dataType: 'boundary_layer', fileSize: 5242880, uploadStatus: 'failed', createdAt: '2026-04-01T07:20:00', username: 'manager' },
  ],
  uav: [
    { uploadId: 2, fileName: 'uav_flight_20260401.csv', dataCategory: 'uav', dataType: 'sensor', fileSize: 12582912, uploadStatus: 'completed', createdAt: '2026-04-01T08:15:00', username: 'partner01' },
  ],
  naqo: [
    { uploadId: 101, fileName: 'NAQO_20260401_08.json', dataCategory: 'naqo', dataType: 'hourly_obs', fileSize: 4096, uploadStatus: 'completed', createdAt: '2026-04-01T08:05:00', username: 'sftp' },
    { uploadId: 102, fileName: 'NAQO_20260401_07.json', dataCategory: 'naqo', dataType: 'hourly_obs', fileSize: 4096, uploadStatus: 'completed', createdAt: '2026-04-01T07:05:00', username: 'sftp' },
    { uploadId: 103, fileName: 'NAQO_20260401_06.json', dataCategory: 'naqo', dataType: 'hourly_obs', fileSize: 4096, uploadStatus: 'failed', createdAt: '2026-04-01T06:05:00', username: 'sftp' },
    { uploadId: 104, fileName: 'NAQO_20260401_05.json', dataCategory: 'naqo', dataType: 'hourly_obs', fileSize: 4096, uploadStatus: 'completed', createdAt: '2026-04-01T05:05:00', username: 'sftp' },
  ],
  windlidar: [
    { uploadId: 201, fileName: 'WindLidar_20260401_08.csv', dataCategory: 'windlidar', dataType: 'hourly_obs', fileSize: 8192, uploadStatus: 'completed', createdAt: '2026-04-01T08:03:00', username: 'sftp' },
    { uploadId: 202, fileName: 'WindLidar_20260401_07.csv', dataCategory: 'windlidar', dataType: 'hourly_obs', fileSize: 8192, uploadStatus: 'completed', createdAt: '2026-04-01T07:03:00', username: 'sftp' },
    { uploadId: 203, fileName: 'WindLidar_20260401_06.csv', dataCategory: 'windlidar', dataType: 'hourly_obs', fileSize: 8192, uploadStatus: 'completed', createdAt: '2026-04-01T06:03:00', username: 'sftp' },
  ],
  mpl: [
    { uploadId: 301, fileName: 'MPL_20260401_08.csv', dataCategory: 'mpl', dataType: 'hourly_obs', fileSize: 6144, uploadStatus: 'completed', createdAt: '2026-04-01T08:04:00', username: 'sftp' },
    { uploadId: 302, fileName: 'MPL_20260401_07.csv', dataCategory: 'mpl', dataType: 'hourly_obs', fileSize: 6144, uploadStatus: 'processing', createdAt: '2026-04-01T07:04:00', username: 'sftp' },
    { uploadId: 303, fileName: 'MPL_20260401_06.csv', dataCategory: 'mpl', dataType: 'hourly_obs', fileSize: 6144, uploadStatus: 'completed', createdAt: '2026-04-01T06:04:00', username: 'sftp' },
  ],
};

type PageSizeOption = 10 | 30 | 50 | 100 | 200 | 'All';
const PAGE_SIZE_OPTIONS: { value: PageSizeOption; label: string }[] = [
  { value: 10, label: '10 筆' }, { value: 30, label: '30 筆' },
  { value: 50, label: '50 筆' }, { value: 100, label: '100 筆' },
  { value: 200, label: '200 筆' }, { value: 'All', label: '全部' },
];

const selectStyles: StylesConfig<{ value: PageSizeOption; label: string }, false> = {
  control: (base, state) => ({
    ...base, borderRadius: 8, fontSize: 13, minHeight: 38,
    border: `1px solid ${state.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
    boxShadow: state.isFocused ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
    backgroundColor: '#fff', '&:hover': { borderColor: '#6abe74' },
  }),
  option: (base, state) => ({
    ...base, fontSize: 13, cursor: 'pointer',
    backgroundColor: state.isSelected ? 'rgba(106,190,116,0.12)' : state.isFocused ? 'rgba(106,190,116,0.06)' : '#fff',
    color: state.isSelected ? '#2d6a4f' : '#374151',
    fontWeight: state.isSelected ? 600 : 400,
  }),
  singleValue: (base) => ({ ...base, color: '#374151', fontWeight: 600 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: '#6abe74', padding: '0 8px' }),
  menu: (base) => ({ ...base, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(106,190,116,0.2)' }),
  menuList: (base) => ({ ...base, padding: 4 }),
};

export default function SourceDatabase() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [allRecords, setAllRecords] = useState<DbRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isSftp = ['naqo', 'windlidar', 'mpl'].includes(category ?? '');
  const categoryLabel = {
    lidar: '光達系統 LiDAR',
    uav: '無人機資料系統',
    naqo: 'NAQO 中大空品站',
    windlidar: 'WindLidar 風廓線光達',
    mpl: 'MPL 微脈衝光達',
  }[category ?? ''] ?? category;

  const fetchAll = useCallback(async () => {
    if (!category) return;
    if (isDemoMode) {
      setAllRecords(MOCK_RECORDS[category] ?? []);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/uploads/by-category/${category}?page=1&limit=9999`), {
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

  const filtered = allRecords.filter(r => {
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    return [r.fileName, DATA_TYPE_LABELS[r.dataType] ?? r.dataType, r.username ?? ''].some(f => f.toLowerCase().includes(kw));
  });

  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(filtered.length / (pageSize as number)));
  const paginated = pageSize === 'All'
    ? filtered
    : filtered.slice((currentPage - 1) * (pageSize as number), currentPage * (pageSize as number));

  const startIdx = filtered.length === 0 ? 0 : pageSize === 'All' ? 1 : (currentPage - 1) * (pageSize as number) + 1;
  const endIdx = filtered.length === 0 ? 0 : pageSize === 'All' ? filtered.length : Math.min(currentPage * (pageSize as number), filtered.length);

  const selectableIds = paginated.filter(r => r.uploadStatus !== 'uploading').map(r => r.uploadId);
  const checkedCount = selectableIds.filter(id => selectedIds.has(id)).length;
  const isAllSelected = selectableIds.length > 0 && checkedCount === selectableIds.length;
  const isIndeterminate = checkedCount > 0 && !isAllSelected;

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => { const n = new Set(prev); selectableIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => new Set([...prev, ...selectableIds]));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    if (isDemoMode) {
      setAllRecords(prev => prev.filter(r => !ids.includes(r.uploadId)));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      return;
    }
    if (!token) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await Promise.all(ids.map(id => uploadService.deleteHistoryRecord(id, token)));
      setAllRecords(prev => prev.filter(r => !ids.includes(r.uploadId)));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const STATUS_LABEL: Record<string, string> = { completed: '完成', failed: '失敗', uploading: '上傳中', cancelled: '已取消' };
    const rows = allRecords
      .filter(r => selectedIds.has(r.uploadId))
      .map(r => ({
        檔案名稱: r.fileName,
        資料類型: DATA_TYPE_LABELS[r.dataType] ?? r.dataType,
        檔案大小: formatSize(r.fileSize),
        上傳者: r.username ?? '-',
        上傳時間: formatTime(r.createdAt),
        狀態: STATUS_LABEL[r.uploadStatus] ?? r.uploadStatus,
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [40, 16, 12, 14, 18, 10].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, category === 'lidar' ? '光達資料' : '無人機資料');
    const ts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date()).replace(/[-: ]/g, '').slice(0, 15);
    XLSX.writeFile(wb, `${category}_records_${ts}.xlsx`);
    setShowExportDialog(false);
  };

  const statusToBadge = (s: string): 'completed' | 'processing' | 'failed' =>
    s === 'completed' ? 'completed' : s === 'failed' ? 'failed' : 'processing';

  return (
    <div>
      <Header
        title={`${categoryLabel} — 資料庫內容`}
        subtitle={`共 ${allRecords.length} 筆資料`}
      />

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => navigate('/data-sources')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid rgba(106,190,116,0.4)',
            backgroundColor: 'transparent', color: '#6abe74',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} /> 返回資料來源
        </button>
      </div>

      <Card>
        {/* 工具列 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: selectedIds.size > 0 ? 12 : 20, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: 0 }}>
            {category === 'lidar' ? '光達' : '無人機'}上傳記錄
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="搜尋檔名、類型、上傳者"
                style={{
                  paddingLeft: 30, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                  borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
                  fontSize: 13, color: '#374151', backgroundColor: '#fff',
                  outline: 'none', width: 240,
                }}
              />
            </div>
            <div style={{ width: 120 }}>
              <Select
                options={PAGE_SIZE_OPTIONS}
                value={PAGE_SIZE_OPTIONS.find(o => o.value === pageSize)}
                onChange={opt => setPageSize(opt?.value ?? 10)}
                styles={selectStyles}
                isSearchable={false}
              />
            </div>
          </div>
        </div>

        {/* 批次操作列 */}
        {selectedIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
            padding: '8px 8px 8px 12px', borderRadius: 8,
            backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>
              已選取 <strong>{selectedIds.size}</strong> 筆
            </span>
            <button
              onClick={() => setShowExportDialog(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 6, border: 'none',
                backgroundColor: '#6abe74', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <FileSpreadsheet size={13} /> 匯出 Excel
            </button>
            <button
              onClick={() => { setDeleteError(null); setShowDeleteDialog(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 6, border: 'none',
                backgroundColor: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Trash2 size={13} /> 刪除選取
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                backgroundColor: 'transparent', color: '#9ca3af',
                fontSize: 18, lineHeight: 1, cursor: 'pointer',
              }}
            >×</button>
          </div>
        )}

        {/* 表格 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>載入中...</div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <th style={{ padding: '8px 12px', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                      onChange={toggleAll}
                      disabled={selectableIds.length === 0}
                      className="custom-checkbox"
                    />
                  </th>
                  {['檔案名稱', '資料類型', '檔案大小', isSftp ? '來源' : '上傳者', '上傳時間', '狀態'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px 12px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
                      {keyword ? '沒有符合條件的記錄' : '尚無資料'}
                    </td>
                  </tr>
                ) : paginated.map(r => {
                  const isSelected = selectedIds.has(r.uploadId);
                  const isUploading = r.uploadStatus === 'uploading';
                  return (
                    <tr key={r.uploadId} style={{
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                      backgroundColor: isSelected ? 'rgba(239,68,68,0.04)' : undefined,
                      transition: 'background-color 0.1s',
                    }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !isUploading && toggleOne(r.uploadId)}
                          disabled={isUploading}
                          className="custom-checkbox"
                        />
                      </td>
                      <td style={{ padding: '12px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{r.fileName}</td>
                      <td style={{ padding: '12px', fontSize: 13, color: '#666' }}>{DATA_TYPE_LABELS[r.dataType] ?? r.dataType}</td>
                      <td style={{ padding: '12px', fontSize: 13, color: '#666' }}>{formatSize(r.fileSize)}</td>
                      <td style={{ padding: '12px', fontSize: 13, color: '#666' }}>{r.username ?? '-'}</td>
                      <td style={{ padding: '12px', fontSize: 13, color: '#666' }}>{formatTime(r.createdAt)}</td>
                      <td style={{ padding: '12px' }}><StatusBadge status={statusToBadge(r.uploadStatus)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 分頁 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            顯示 {startIdx}–{endIdx} / 共 {filtered.length} 筆
          </span>
          {pageSize !== 'All' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', backgroundColor: currentPage === 1 ? '#f3f4f6' : '#fff', color: currentPage === 1 ? '#9ca3af' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}
              >上一頁</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={{ minWidth: 30, height: 30, borderRadius: 8, border: `1px solid ${p === currentPage ? '#6abe74' : '#d1d5db'}`, backgroundColor: p === currentPage ? '#6abe74' : '#fff', color: p === currentPage ? '#fff' : '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >{p}</button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#fff', color: currentPage === totalPages ? '#9ca3af' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 12 }}
              >下一頁</button>
            </div>
          )}
        </div>
      </Card>

      {/* 匯出確認 Dialog */}
      {showExportDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 220, backgroundColor: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowExportDialog(false)}>
          <div style={{ width: 'min(460px, calc(100vw - 32px))', borderRadius: 16, backgroundColor: '#F4F2E9', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', padding: 22 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>確認匯出 Excel</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              即將將已選取的 <strong>{selectedIds.size}</strong> 筆記錄匯出為 Excel 檔案。
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowExportDialog(false)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)', backgroundColor: 'transparent', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>取消</button>
              <button onClick={handleExport} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', backgroundColor: '#6abe74', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileSpreadsheet size={14} /> 確認匯出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 Dialog */}
      {showDeleteDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 220, backgroundColor: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { if (!isDeleting) { setShowDeleteDialog(false); setDeleteError(null); } }}>
          <div style={{ width: 'min(460px, calc(100vw - 32px))', borderRadius: 16, backgroundColor: '#F4F2E9', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', padding: 22 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>確認批次刪除</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              你即將刪除 <strong>{selectedIds.size}</strong> 筆記錄，刪除後將同步移除資料庫紀錄與檔案，且無法復原。
            </div>
            {deleteError && (
              <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', fontSize: 12 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={() => { setShowDeleteDialog(false); setDeleteError(null); }} disabled={isDeleting}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)', backgroundColor: 'transparent', color: '#6b7280', fontSize: 13, cursor: isDeleting ? 'not-allowed' : 'pointer' }}>取消</button>
              <button onClick={handleDelete} disabled={isDeleting}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', backgroundColor: isDeleting ? '#fca5a5' : '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={14} /> {isDeleting ? '刪除中...' : `確認刪除 (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
