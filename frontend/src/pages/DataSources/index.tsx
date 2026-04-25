import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Clock, Plug, Settings, ScrollText, X, CheckCircle, XCircle, AlertCircle, Database, ServerCog } from 'lucide-react';
import Select from 'react-select';
import Card from '../../components/Card';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/StatusBadge';
import { useAppData } from '../../contexts/AppDataContext';
import type { SourceRecord } from '../../contexts/AppDataContext';

const mockLogs: Record<string, { time: string; status: 'success' | 'error' | 'pending'; message: string }[]> = {
  '1': [
    { time: '2026-04-01 06:30', status: 'pending', message: '等待光達系統回應中...' },
    { time: '2026-04-01 04:30', status: 'success', message: '同步成功，取得點雲資料 245 MB' },
  ],
  '2': [
    { time: '2026-03-31 15:00', status: 'error', message: '連線逾時，無人機系統離線' },
    { time: '2026-03-31 13:00', status: 'error', message: '連線逾時，無人機系統離線' },
    { time: '2026-03-31 11:00', status: 'success', message: '同步成功，取得飛行資料 12 MB' },
  ],
  '3': [
    { time: '2026-04-01 08:30', status: 'success', message: '同步成功，取得 1,240 筆資料' },
    { time: '2026-04-01 07:30', status: 'success', message: '同步成功，取得 1,198 筆資料' },
    { time: '2026-04-01 06:30', status: 'error',   message: 'HTTP 503 Service Unavailable' },
    { time: '2026-04-01 05:30', status: 'success', message: '同步成功，取得 1,215 筆資料' },
  ],
  '4': [
    { time: '2026-04-01 08:25', status: 'success', message: '同步成功，取得 88 筆觀測資料' },
    { time: '2026-04-01 07:55', status: 'success', message: '同步成功，取得 91 筆觀測資料' },
    { time: '2026-04-01 07:25', status: 'success', message: '同步成功，取得 87 筆觀測資料' },
  ],
  '5': [
    { time: '2026-04-01 08:28', status: 'success', message: '同步成功，取得 320 個感測器資料' },
    { time: '2026-04-01 08:13', status: 'success', message: '同步成功，取得 318 個感測器資料' },
    { time: '2026-04-01 07:58', status: 'error',   message: 'JSON 解析錯誤：Unexpected token' },
    { time: '2026-04-01 07:43', status: 'success', message: '同步成功，取得 315 個感測器資料' },
  ],
};

const mockSftpLogs: Record<string, { time: string; fileName: string; dataTime: string; status: 'parsed' | 'failed' | 'received'; errorMsg?: string }[]> = {
  '6': [
    { time: '2026-04-01 08:05', fileName: 'NAQO_20260401_08.json', dataTime: '2026-04-01 08:00', status: 'parsed' },
    { time: '2026-04-01 07:05', fileName: 'NAQO_20260401_07.json', dataTime: '2026-04-01 07:00', status: 'parsed' },
    { time: '2026-04-01 06:05', fileName: 'NAQO_20260401_06.json', dataTime: '2026-04-01 06:00', status: 'failed', errorMsg: '欄位缺失：pm25' },
    { time: '2026-04-01 05:05', fileName: 'NAQO_20260401_05.json', dataTime: '2026-04-01 05:00', status: 'parsed' },
  ],
  '7': [
    { time: '2026-04-01 08:03', fileName: 'WindLidar_20260401_08.csv', dataTime: '2026-04-01 08:00', status: 'parsed' },
    { time: '2026-04-01 07:03', fileName: 'WindLidar_20260401_07.csv', dataTime: '2026-04-01 07:00', status: 'parsed' },
    { time: '2026-04-01 06:03', fileName: 'WindLidar_20260401_06.csv', dataTime: '2026-04-01 06:00', status: 'parsed' },
  ],
  '8': [
    { time: '2026-04-01 08:04', fileName: 'MPL_20260401_08.csv', dataTime: '2026-04-01 08:00', status: 'parsed' },
    { time: '2026-04-01 07:04', fileName: 'MPL_20260401_07.csv', dataTime: '2026-04-01 07:00', status: 'received' },
    { time: '2026-04-01 06:04', fileName: 'MPL_20260401_06.csv', dataTime: '2026-04-01 06:00', status: 'parsed' },
  ],
};

const SOURCE_TYPES = ['EPA', 'CWA', 'IoT', 'UAV', 'WindProfiler', 'SFTP'] as const;
const sourceTypeOptions = SOURCE_TYPES.map(t => ({ value: t, label: t }));

const selectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base, borderRadius: 8, fontSize: 13, minHeight: 38,
    border: `1px solid ${state.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
    boxShadow: state.isFocused ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
    backgroundColor: '#fff', '&:hover': { borderColor: '#6abe74' },
  }),
  option: (base: object, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base, fontSize: 13, cursor: 'pointer',
    backgroundColor: state.isSelected ? 'rgba(106,190,116,0.15)' : state.isFocused ? 'rgba(106,190,116,0.06)' : '#fff',
    color: state.isSelected ? '#2d6a4f' : '#374151',
    fontWeight: state.isSelected ? 600 : 400,
  }),
  singleValue: (base: object) => ({ ...base, color: '#374151', fontWeight: 600 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: object) => ({ ...base, color: '#6abe74', padding: '0 8px' }),
  menu: (base: object) => ({ ...base, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(106,190,116,0.2)' }),
  menuList: (base: object) => ({ ...base, padding: 4 }),
  menuPortal: (base: object) => ({ ...base, zIndex: 9999 }),
};

const emptyForm = { name: '', type: 'EPA' as SourceRecord['type'], endpoint: '', frequency: 60 };

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, color: '#374151',
  backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' as const,
};
const labelStyle = {
  display: 'block' as const, fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600 as const,
};

const logStatusIcon = (s: string) => {
  if (s === 'success') return <CheckCircle size={13} color="#6abe74" />;
  if (s === 'error')   return <XCircle size={13} color="#e57373" />;
  return <AlertCircle size={13} color="#f0a500" />;
};

export default function DataSources() {
  const { sources, setSources } = useAppData();
  const navigate = useNavigate();
  const [testingId, setTestingId]   = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [editingSrc, setEditingSrc] = useState<SourceRecord | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [errors, setErrors]         = useState<Partial<typeof emptyForm>>({});
  const [logSrc, setLogSrc]         = useState<SourceRecord | null>(null);
  const [sftpLogSrc, setSftpLogSrc] = useState<SourceRecord | null>(null);

  const isEditing = editingSrc !== null;

  const handleTest = (id: string) => {
    setTestingId(id);
    setTimeout(() => setTestingId(null), 2000);
  };

  const openAdd = () => { setEditingSrc(null); setForm(emptyForm); setErrors({}); setShowForm(true); };
  const openEdit = (src: SourceRecord) => {
    setEditingSrc(src);
    setForm({ name: src.name, type: src.type as typeof emptyForm['type'], endpoint: src.endpoint, frequency: src.frequency });
    setErrors({});
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingSrc(null); setErrors({}); };

  const validate = () => {
    const e: Partial<typeof emptyForm> = {};
    if (!form.name.trim())     e.name = '請輸入名稱';
    if (!form.endpoint.trim()) e.endpoint = '請輸入 API 端點';
    else if (!/^https?:\/\/.+/.test(form.endpoint.trim())) e.endpoint = '請輸入有效的 URL（http/https）';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (isEditing) {
      setSources(prev => prev.map(s => s.id === editingSrc.id
        ? { ...s, name: form.name.trim(), type: form.type, endpoint: form.endpoint.trim(), frequency: Number(form.frequency) }
        : s));
    } else {
      const newId = String(Math.max(...sources.map(s => Number(s.id))) + 1);
      setSources(prev => [...prev, {
        id: newId, name: form.name.trim(), type: form.type,
        endpoint: form.endpoint.trim(), frequency: Number(form.frequency),
        active: true, lastSync: '—', status: 'pending',
      }]);
    }
    closeForm();
  };

  return (
    <div>
      <Header title="資料來源管理" subtitle="管理各資料來源的 API 設定與同步排程" />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={openAdd} style={{
          padding: '10px 20px', backgroundColor: '#6abe74',
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ 新增資料來源</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sources.map(src => (
          <Card key={src.id} padding={20}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: 'rgba(106,190,116,0.1)',
                  border: '1px solid rgba(106,190,116,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#6abe74',
                }}>{src.type}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{src.name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.endpoint}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={src.status} />
                <StatusBadge status={src.active ? 'active' : 'inactive'} />
              </div>
            </div>

            <div style={{
              display: 'flex', gap: 24, marginTop: 16,
              padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.05)',
              fontSize: 12, color: '#666', flexWrap: 'wrap',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} color="#6abe74" />
                {src.transferMode === 'sftp'
                  ? <><strong style={{ color: '#374151' }}>逐時接收</strong>（SFTP）</>
                  : <>同步頻率：<strong style={{ color: '#374151' }}>{src.frequency > 0 ? `每 ${src.frequency} 分鐘` : '手動'}</strong></>
                }
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color="#6abe74" />
                最後同步：<strong style={{ color: '#374151' }}>{src.lastSync}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {(src.type === 'UAV' || src.type === 'SFTP') && (
                <button onClick={() => {
                  const catMap: Record<string, string> = { '6': 'naqo', '7': 'windlidar', '8': 'mpl' };
                  const cat = catMap[src.id] ?? src.type.toLowerCase();
                  navigate(`/source-db/${cat}`);
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid rgba(106,190,116,0.4)',
                  backgroundColor: 'rgba(106,190,116,0.08)', color: '#4a9e55',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  <Database size={12} />
                  瀏覽資料庫
                </button>
              )}
              {src.type === 'SFTP' ? (
                <button onClick={() => setSftpLogSrc(src)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid rgba(106,190,116,0.4)',
                  backgroundColor: 'transparent', color: '#6abe74',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  <ServerCog size={12} />
                  傳輸記錄
                </button>
              ) : (
                <button onClick={() => handleTest(src.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid rgba(106,190,116,0.4)',
                  backgroundColor: 'transparent', color: '#6abe74',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  <Plug size={12} />
                  {testingId === src.id ? '測試中...' : '測試連線'}
                </button>
              )}
              <button onClick={() => openEdit(src)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.1)',
                backgroundColor: 'transparent', color: '#666',
                fontSize: 12, cursor: 'pointer',
              }}>
                <Settings size={12} />
                編輯設定
              </button>
              <button onClick={() => setLogSrc(src)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.1)',
                backgroundColor: 'transparent', color: '#666',
                fontSize: 12, cursor: 'pointer',
              }}>
                <ScrollText size={12} />
                同步日誌
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* ── 新增 / 編輯 Modal ── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={closeForm}>
          <div style={{
            backgroundColor: '#F4F2E9', borderRadius: 20, padding: 28,
            width: 'min(480px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
                {isEditing ? '編輯資料來源' : '新增資料來源'}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={18} color="#999" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>名稱 *</label>
                <input style={{ ...inputStyle, borderColor: errors.name ? '#e57373' : 'rgba(0,0,0,0.12)' }}
                  value={form.name} placeholder="例：環境部空品監測網"
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                {errors.name && <div style={{ fontSize: 11, color: '#e57373', marginTop: 4 }}>{errors.name}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>資料類型 *</label>
                  <Select
                    options={sourceTypeOptions}
                    value={sourceTypeOptions.find(o => o.value === form.type)}
                    onChange={opt => setForm(p => ({ ...p, type: (opt?.value ?? 'EPA') as typeof emptyForm['type'] }))}
                    styles={selectStyles}
                    isSearchable={false}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
                <div>
                  <label style={labelStyle}>同步頻率（分鐘）</label>
                  <input style={inputStyle} type="number" min={0} max={1440}
                    value={form.frequency} placeholder="0 = 手動"
                    onChange={e => setForm(p => ({ ...p, frequency: Number(e.target.value) }))} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>API 端點 *</label>
                <input style={{ ...inputStyle, borderColor: errors.endpoint ? '#e57373' : 'rgba(0,0,0,0.12)', fontFamily: 'monospace' }}
                  value={form.endpoint} placeholder="https://api.example.com/v1/data"
                  onChange={e => setForm(p => ({ ...p, endpoint: e.target.value }))} />
                {errors.endpoint && <div style={{ fontSize: 11, color: '#e57373', marginTop: 4 }}>{errors.endpoint}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={closeForm} style={{
                padding: '9px 20px', borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                backgroundColor: 'transparent', color: '#666',
                fontSize: 13, cursor: 'pointer',
              }}>取消</button>
              <button onClick={handleSubmit} style={{
                padding: '9px 20px', borderRadius: 10,
                border: 'none', backgroundColor: '#6abe74',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{isEditing ? '儲存' : '新增'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 同步日誌 Modal ── */}
      {logSrc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setLogSrc(null)}>
          <div style={{
            backgroundColor: '#F4F2E9', borderRadius: 20, padding: 28,
            width: 'min(520px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 2 }}>同步日誌</h2>
                <div style={{ fontSize: 12, color: '#999' }}>{logSrc.name}</div>
              </div>
              <button onClick={() => setLogSrc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={18} color="#999" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(mockLogs[logSrc.id] ?? []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#999', fontSize: 13 }}>尚無同步記錄</div>
              ) : (mockLogs[logSrc.id] ?? []).map((log, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}>
                  <div style={{ marginTop: 1 }}>{logStatusIcon(log.status)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>{log.message}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{log.time}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    color: log.status === 'success' ? '#6abe74' : log.status === 'error' ? '#e57373' : '#f0a500',
                    backgroundColor: log.status === 'success' ? 'rgba(106,190,116,0.12)' : log.status === 'error' ? 'rgba(229,115,115,0.12)' : 'rgba(240,165,0,0.12)',
                  }}>
                    {log.status === 'success' ? '成功' : log.status === 'error' ? '失敗' : '等待中'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ── SFTP 傳輸記錄 Modal ── */}
      {sftpLogSrc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSftpLogSrc(null)}>
          <div style={{
            backgroundColor: '#F4F2E9', borderRadius: 20, padding: 28,
            width: 'min(600px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 2 }}>SFTP 傳輸記錄</h2>
                <div style={{ fontSize: 12, color: '#999' }}>{sftpLogSrc.name}</div>
              </div>
              <button onClick={() => setSftpLogSrc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={18} color="#999" />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    {['檔案名稱', '資料時間', '狀態', '接收時間', '錯誤訊息'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#999', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(mockSftpLogs[sftpLogSrc.id] ?? []).length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>尚無傳輸記錄</td></tr>
                  ) : (mockSftpLogs[sftpLogSrc.id] ?? []).map((log, i) => {
                    const statusColor = log.status === 'parsed' ? '#6abe74' : log.status === 'failed' ? '#e57373' : '#f0a500';
                    const statusLabel = log.status === 'parsed' ? '已解析' : log.status === 'failed' ? '失敗' : '已接收';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '10px', color: '#374151', fontFamily: 'monospace', fontSize: 11 }}>{log.fileName}</td>
                        <td style={{ padding: '10px', color: '#666' }}>{log.dataTime}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            color: statusColor,
                            backgroundColor: log.status === 'parsed' ? 'rgba(106,190,116,0.12)' : log.status === 'failed' ? 'rgba(229,115,115,0.12)' : 'rgba(240,165,0,0.12)',
                          }}>{statusLabel}</span>
                        </td>
                        <td style={{ padding: '10px', color: '#666' }}>{log.time}</td>
                        <td style={{ padding: '10px', color: '#e57373', fontSize: 11 }}>{log.errorMsg ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
