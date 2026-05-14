import { useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, Plus, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import Select from 'react-select';
import Card from '../../components/Card';
import DatePicker from '../../components/DatePicker';
import IncidentFormModal from './IncidentFormModal';
import IncidentDetailModal from './IncidentDetailModal';
import IncidentAnalyticsSection from './IncidentAnalyticsSection';
import {
  INCIDENT_TYPE_OPTIONS,
  SOURCE_COLORS,
  fmtDt,
  calcDuration,
  getTypeLabel,
} from './incidentTypes';
import type { CSSProperties } from 'react';
import type { SftpIncident } from './incidentTypes';

// ── Mock data ──────────────────────────────────────────────────────
const MOCK_INCIDENTS: SftpIncident[] = [
  {
    id: 1,
    source: 'NAQO',
    incident_type: 'network_disconnect',
    started_at: '2026-04-28T14:30:00+08:00',
    ended_at: '2026-04-28T15:45:00+08:00',
    affected_range: '4/28 14:00~15:00 整點資料未傳送',
    note: 'SFTP 伺服器 IP 位址變更導致連線失敗，聯繫站點工程師後於 15:45 恢復正常',
    reporter_name: '王小明',
    created_at: '2026-04-28T16:00:00+08:00',
  },
  {
    id: 2,
    source: 'WindLidar',
    incident_type: 'software_update',
    started_at: '2026-05-02T09:00:00+08:00',
    ended_at: '2026-05-02T10:30:00+08:00',
    affected_range: '5/2 09:00~10:00 WindLidar 資料中斷',
    note: '站點電腦進行 Windows 系統更新，重啟後自動恢復',
    reporter_name: '李小華',
    created_at: '2026-05-02T10:45:00+08:00',
  },
  {
    id: 3,
    source: 'MPL',
    incident_type: 'instrument_maintenance',
    started_at: '2026-05-05T08:00:00+08:00',
    ended_at: '2026-05-05T12:00:00+08:00',
    affected_range: '5/5 08:00~12:00 MPL 儀器關機',
    note: '年度例行校正維護',
    reporter_name: '張大偉',
    created_at: '2026-05-05T07:30:00+08:00',
  },
  {
    id: 4,
    source: 'NAQO',
    incident_type: 'power_outage',
    started_at: '2026-05-08T22:15:00+08:00',
    ended_at: null,
    affected_range: '5/8 22:00 後 NAQO 資料尚未恢復傳輸',
    note: '',
    reporter_name: '王小明',
    created_at: '2026-05-09T08:00:00+08:00',
  },
];

type PageSizeOption = 10 | 30 | 50 | 100 | 200 | 'All';

const PAGE_SIZE_OPTIONS: { value: PageSizeOption; label: string }[] = [
  { value: 10,    label: '10 筆' },
  { value: 30,    label: '30 筆' },
  { value: 50,    label: '50 筆' },
  { value: 100,   label: '100 筆' },
  { value: 200,   label: '200 筆' },
  { value: 'All', label: '全部' },
];

const pageSizeSelectStyles = {
  control: (b: object, s: { isFocused: boolean }) => ({
    ...b, borderRadius: 8, fontSize: 13, minHeight: 36, width: 100,
    border: `1px solid ${s.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
    boxShadow: s.isFocused ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
    backgroundColor: '#fff', '&:hover': { borderColor: '#6abe74' }, cursor: 'pointer',
  }),
  option: (b: object, s: { isSelected: boolean; isFocused: boolean }) => ({
    ...b, fontSize: 13, cursor: 'pointer',
    backgroundColor: s.isSelected ? 'rgba(106,190,116,0.12)' : s.isFocused ? 'rgba(106,190,116,0.06)' : '#fff',
    color: s.isSelected ? '#2d6a4f' : '#374151', fontWeight: s.isSelected ? 600 : 400,
  }),
  singleValue: (b: object) => ({ ...b, color: '#374151', fontWeight: 600 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (b: object) => ({ ...b, color: '#6abe74', padding: '0 8px' }),
  menu: (b: object) => ({ ...b, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(106,190,116,0.2)', width: 100 }),
  menuList: (b: object) => ({ ...b, padding: 4 }),
  menuPortal: (b: object) => ({ ...b, zIndex: 9999 }),
  valueContainer: (b: object) => ({ ...b, padding: '0 8px' }),
};

// ── Shared select styles (filter variant: slightly slimmer) ────────
const filterSelectStyles = {
  control: (b: object, s: { isFocused: boolean }) => ({
    ...b, borderRadius: 8, fontSize: 13, minHeight: 36,
    border: `1px solid ${s.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
    boxShadow: s.isFocused ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
    backgroundColor: '#fff', '&:hover': { borderColor: '#6abe74' },
    cursor: 'pointer',
  }),
  option: (b: object, s: { isSelected: boolean; isFocused: boolean }) => ({
    ...b, fontSize: 13, cursor: 'pointer',
    backgroundColor: s.isSelected ? 'rgba(106,190,116,0.15)' : s.isFocused ? 'rgba(106,190,116,0.06)' : '#fff',
    color: s.isSelected ? '#2d6a4f' : '#374151',
    fontWeight: s.isSelected ? 600 : 400,
  }),
  singleValue: (b: object) => ({ ...b, color: '#374151' }),
  placeholder: (b: object) => ({ ...b, color: '#aaa', fontSize: 13 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (b: object) => ({ ...b, color: '#6abe74', padding: '0 6px' }),
  clearIndicator: (b: object) => ({ ...b, color: '#bbb', padding: '0 4px', cursor: 'pointer' }),
  menu: (b: object) => ({ ...b, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(106,190,116,0.2)' }),
  menuList: (b: object) => ({ ...b, padding: 4 }),
  menuPortal: (b: object) => ({ ...b, zIndex: 9999 }),
  valueContainer: (b: object) => ({ ...b, padding: '0 8px' }),
};

const sourceFilterOpts = [
  { value: 'NAQO', label: 'NAQO' },
  { value: 'WindLidar', label: 'WindLidar' },
  { value: 'MPL', label: 'MPL' },
];
const statusFilterOpts = [
  { value: 'ongoing',  label: '異常中' },
  { value: 'resolved', label: '已復原' },
];
const typeFilterOpts = INCIDENT_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }));

const thStyle: CSSProperties = {
  padding: '10px 14px', textAlign: 'left',
  color: '#999', fontWeight: 600, fontSize: 12,
  whiteSpace: 'nowrap',
};

export default function IncidentLogSection() {
  const [incidents, setIncidents] = useState<SftpIncident[]>(MOCK_INCIDENTS);

  // Filters (null/'' = show all)
  const [filterSource,   setFilterSource]   = useState<string | null>(null);
  const [filterType,     setFilterType]     = useState<string | null>(null);
  const [filterStatus,   setFilterStatus]   = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [page, setPage]                     = useState(1);

  const invalidDateRange = Boolean(filterDateFrom && filterDateTo && filterDateFrom > filterDateTo);

  // Page size
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<SftpIncident | null>(null);
  const [detailItem, setDetailItem] = useState<SftpIncident | null>(null);

  // ── Filtering ──────────────────────────────────────────────────
  const filtered = incidents.filter(inc => {
    if (filterSource && inc.source !== filterSource) return false;
    if (filterType   && inc.incident_type !== filterType) return false;
    if (filterStatus === 'ongoing'  && inc.ended_at !== null) return false;
    if (filterStatus === 'resolved' && inc.ended_at === null) return false;
    if (!invalidDateRange) {
      const d = inc.started_at.slice(0, 10);
      if (filterDateFrom && d < filterDateFrom) return false;
      if (filterDateTo   && d > filterDateTo)   return false;
    }
    return true;
  });

  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = pageSize === 'All' ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── Handlers ───────────────────────────────────────────────────
  const openCreate = () => { setEditTarget(null); setShowForm(true); };
  const openEdit   = (inc: SftpIncident) => { setEditTarget(inc); setShowForm(true); };

  const handleFormSubmit = (data: Omit<SftpIncident, 'id' | 'reporter_name' | 'created_at'>) => {
    if (editTarget) {
      setIncidents(prev => prev.map(i => i.id === editTarget.id ? { ...editTarget, ...data } : i));
    } else {
      const newId = Math.max(0, ...incidents.map(i => i.id)) + 1;
      setIncidents(prev => [{
        ...data, id: newId,
        reporter_name: '目前使用者',
        created_at: new Date().toISOString(),
      }, ...prev]);
      setPage(1);
    }
  };

  const handleResolve = (id: number) => {
    setIncidents(prev =>
      prev.map(i => i.id === id ? { ...i, ended_at: new Date().toISOString() } : i)
    );
  };

  const pageIds        = paginated.map(i => i.id);
  const isAllSelected  = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const isIndeterminate = !isAllSelected && pageIds.some(id => selectedIds.has(id));

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) pageIds.forEach(id => next.delete(id));
      else               pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleExportExcel = () => {
    const rows = incidents
      .filter(i => selectedIds.has(i.id))
      .map(i => ({
        '來源':         i.source,
        '異常類型':     getTypeLabel(i.incident_type),
        '異常開始':     fmtDt(i.started_at),
        '異常結束':     i.ended_at ? fmtDt(i.ended_at) : '尚未恢復',
        '持續時間':     calcDuration(i.started_at, i.ended_at),
        '狀態':         i.ended_at ? '已復原' : '異常中',
        '影響資料範圍': i.affected_range,
        '記錄者':       i.reporter_name,
        '備註':         i.note,
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [8, 18, 18, 18, 12, 8, 28, 10, 28].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '異常事件');
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `SFTP異常事件_${ts}.xlsx`);
  };

  const changeFilter = (setter: (v: string | null) => void) =>
    (opt: { value: string } | null) => { setter(opt?.value ?? null); setPage(1); };

  // ── Status badge ───────────────────────────────────────────────
  const statusBadge = (inc: SftpIncident) => {
    const ongoing = inc.ended_at === null;
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '3px 10px',
        borderRadius: 20, whiteSpace: 'nowrap' as const,
        color: ongoing ? '#f0a500' : '#6abe74',
        backgroundColor: ongoing ? 'rgba(240,165,0,0.12)' : 'rgba(106,190,116,0.12)',
      }}>
        {ongoing ? '異常中' : '已復原'}
      </span>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 12,
            border: 'none', backgroundColor: '#6abe74',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          新增事件
        </button>
      </div>

      <IncidentAnalyticsSection incidents={incidents} />

      <Card padding={24}>

        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'rgba(240,165,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={18} color="#f0a500" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>SFTP 傳輸異常事件記錄</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 1 }}>NAQO · WindLidar · MPL</div>
            </div>
          </div>
          <Select
            options={PAGE_SIZE_OPTIONS}
            value={PAGE_SIZE_OPTIONS.find(o => o.value === pageSize)}
            onChange={opt => { setPageSize(opt?.value ?? 10); setPage(1); }}
            styles={pageSizeSelectStyles}
            isSearchable={false}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 140 }}>
            <Select
              options={sourceFilterOpts}
              value={sourceFilterOpts.find(o => o.value === filterSource) ?? null}
              onChange={changeFilter(setFilterSource)}
              styles={filterSelectStyles}
              placeholder="全部來源"
              isClearable
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>
          <div style={{ width: 230 }}>
            <Select
              options={typeFilterOpts}
              value={typeFilterOpts.find(o => o.value === filterType) ?? null}
              onChange={changeFilter(setFilterType)}
              styles={filterSelectStyles}
              placeholder="全部類型"
              isClearable
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>
          <div style={{ width: 140 }}>
            <Select
              options={statusFilterOpts}
              value={statusFilterOpts.find(o => o.value === filterStatus) ?? null}
              onChange={changeFilter(setFilterStatus)}
              styles={filterSelectStyles}
              placeholder="全部狀態"
              isClearable
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>日期</span>
            <div style={{ width: 132 }}>
              <DatePicker
                value={filterDateFrom}
                onChange={v => { setFilterDateFrom(v); setPage(1); }}
                placeholder="開始日期"
                isClearable
                small
              />
            </div>
            <span style={{ fontSize: 13, color: '#ccc' }}>—</span>
            <div style={{ width: 132 }}>
              <DatePicker
                value={filterDateTo}
                onChange={v => { setFilterDateTo(v); setPage(1); }}
                placeholder="結束日期"
                isClearable
                small
              />
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#999' }}>
            共 <strong style={{ color: '#374151' }}>{filtered.length}</strong> 筆
          </div>
        </div>
        {invalidDateRange && (
          <div style={{ fontSize: 12, color: '#e57373', fontWeight: 600, marginTop: 6 }}>
            開始日期必須早於或等於結束日期
          </div>
        )}

        {/* Selection bar */}
        {selectedIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 12, padding: '8px 8px 8px 12px',
            borderRadius: 8,
            backgroundColor: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>
              已選取 <strong>{selectedIds.size}</strong> 筆
            </span>
            <button
              onClick={handleExportExcel}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 6, border: 'none',
                backgroundColor: '#6abe74', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <FileSpreadsheet size={13} /> 匯出 Excel
            </button>
            <button
              onClick={clearSelection}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                border: 'none', backgroundColor: 'transparent',
                color: '#9ca3af', fontSize: 18, lineHeight: 1, cursor: 'pointer',
              }}
            >×</button>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <th style={{ padding: '10px 14px', width: 40 }}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={isAllSelected}
                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={toggleAll}
                    disabled={pageIds.length === 0}
                  />
                </th>
                <th style={{ ...thStyle, width: '8%'  }}>來源</th>
                <th style={{ ...thStyle, width: '22%' }}>異常類型</th>
                <th style={{ ...thStyle, width: '16%' }}>異常開始</th>
                <th style={{ ...thStyle, width: '16%' }}>異常結束</th>
                <th style={{ ...thStyle, width: '10%' }}>持續時間</th>
                <th style={{ ...thStyle, width: '9%'  }}>狀態</th>
                <th style={{ ...thStyle, width: '9%'  }}>記錄者</th>
                <th style={{ ...thStyle, width: '10%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>
                    尚無符合條件的異常事件記錄
                  </td>
                </tr>
              ) : paginated.map(inc => {
                const sc        = SOURCE_COLORS[inc.source];
                const ongoing   = inc.ended_at === null;
                const isChecked = selectedIds.has(inc.id);
                return (
                  <tr key={inc.id} style={{
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    backgroundColor: isChecked ? 'rgba(239,68,68,0.04)' : undefined,
                  }}>
                    {/* Checkbox */}
                    <td style={{ padding: '12px 14px' }}>
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(inc.id)}
                      />
                    </td>
                    {/* Source */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px',
                        borderRadius: 6, whiteSpace: 'nowrap' as const,
                        color: sc.color, backgroundColor: sc.bg,
                      }}>{inc.source}</span>
                    </td>
                    {/* Type */}
                    <td style={{ padding: '12px 14px', color: '#374151' }}>
                      {getTypeLabel(inc.incident_type)}
                    </td>
                    {/* Started at */}
                    <td style={{ padding: '12px 14px', color: '#555', whiteSpace: 'nowrap' as const }}>
                      {fmtDt(inc.started_at)}
                    </td>
                    {/* Ended at */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' as const, color: ongoing ? '#f0a500' : '#555' }}>
                      {ongoing ? '尚未恢復' : fmtDt(inc.ended_at)}
                    </td>
                    {/* Duration */}
                    <td style={{ padding: '12px 14px', color: '#555', whiteSpace: 'nowrap' as const }}>
                      {calcDuration(inc.started_at, inc.ended_at)}
                    </td>
                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>{statusBadge(inc)}</td>
                    {/* Reporter */}
                    <td style={{ padding: '12px 14px', color: '#666', fontSize: 12 }}>
                      {inc.reporter_name}
                    </td>
                    {/* Action */}
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => setDetailItem(inc)}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          border: '1px solid rgba(0,0,0,0.1)',
                          backgroundColor: 'transparent', color: '#6abe74',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >詳情</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <span style={{ fontSize: 12, color: '#999' }}>
              第 <strong style={{ color: '#374151' }}>{page}</strong> / {totalPages} 頁
            </span>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.12)',
                backgroundColor: page === 1 ? 'rgba(0,0,0,0.03)' : '#fff',
                color: page === 1 ? '#ccc' : '#374151',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><ChevronLeft size={14} /></button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.12)',
                backgroundColor: page === totalPages ? 'rgba(0,0,0,0.03)' : '#fff',
                color: page === totalPages ? '#ccc' : '#374151',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><ChevronRight size={14} /></button>
          </div>
        )}
      </Card>

      {/* Modals */}
      <IncidentFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        initial={editTarget}
      />
      <IncidentDetailModal
        incident={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={inc => { setDetailItem(null); openEdit(inc); }}
        onResolve={handleResolve}
      />
    </>
  );
}
