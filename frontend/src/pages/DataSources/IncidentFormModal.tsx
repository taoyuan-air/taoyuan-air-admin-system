import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Select from 'react-select';
import DateTimePicker from '../../components/DateTimePicker';
import {
  INCIDENT_TYPE_OPTIONS,
  INCIDENT_SOURCE_OPTIONS,
  toDatetimeLocal,
} from './incidentTypes';
import type { SftpIncident, IncidentSource, IncidentTypeValue } from './incidentTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<SftpIncident, 'id' | 'reporter_name' | 'created_at'>) => void;
  initial?: SftpIncident | null;
}

type Errs = {
  source?: string;
  incident_type?: string;
  started_at?: string;
  ended_at?: string;
};

const labelStyle = {
  display: 'block' as const, fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600 as const,
};
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, color: '#374151',
  backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' as const,
};
const errStyle = { fontSize: 11, color: '#e57373', marginTop: 4 };
const hintStyle = { fontSize: 11, color: '#aaa', marginTop: 4 };

const isInvalidIncidentRange = (startedAt: string, endedAt: string) => Boolean(startedAt && endedAt && startedAt > endedAt);

const selectStyles = {
  control: (b: object, s: { isFocused: boolean }) => ({
    ...b, borderRadius: 8, fontSize: 13, minHeight: 38,
    border: `1px solid ${s.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
    boxShadow: s.isFocused ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
    backgroundColor: '#fff', '&:hover': { borderColor: '#6abe74' },
  }),
  option: (b: object, s: { isSelected: boolean; isFocused: boolean }) => ({
    ...b, fontSize: 13, cursor: 'pointer',
    backgroundColor: s.isSelected ? 'rgba(106,190,116,0.15)' : s.isFocused ? 'rgba(106,190,116,0.06)' : '#fff',
    color: s.isSelected ? '#2d6a4f' : '#374151',
    fontWeight: s.isSelected ? 600 : 400,
  }),
  singleValue: (b: object) => ({ ...b, color: '#374151', fontWeight: 600 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (b: object) => ({ ...b, color: '#6abe74', padding: '0 8px' }),
  menu: (b: object) => ({ ...b, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(106,190,116,0.2)' }),
  menuList: (b: object) => ({ ...b, padding: 4 }),
  menuPortal: (b: object) => ({ ...b, zIndex: 9999 }),
};

export default function IncidentFormModal({ isOpen, onClose, onSubmit, initial }: Props) {
  const [source, setSource]               = useState<IncidentSource | null>(null);
  const [type, setType]                   = useState<IncidentTypeValue | null>(null);
  const [startedAt, setStartedAt]         = useState('');
  const [endedAt, setEndedAt]             = useState('');
  const [affectedRange, setAffectedRange] = useState('');
  const [note, setNote]                   = useState('');
  const [errs, setErrs]                   = useState<Errs>({});

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setSource(initial?.source ?? null);
      setType(initial?.incident_type ?? null);
      setStartedAt(initial ? toDatetimeLocal(initial.started_at) : '');
      setEndedAt(initial?.ended_at ? toDatetimeLocal(initial.ended_at) : '');
      setAffectedRange(initial?.affected_range ?? '');
      setNote(initial?.note ?? '');
      setErrs({});
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const clearErr = (field: keyof Errs) => setErrs(p => ({ ...p, [field]: undefined }));

  const validate = (): Errs => {
    const e: Errs = {};
    if (!source) e.source = '請選擇資料來源';
    if (!type) e.incident_type = '請選擇異常類型';
    if (!startedAt) e.started_at = '請輸入異常開始時間';
    if (isInvalidIncidentRange(startedAt, endedAt)) e.ended_at = '結束時間必須大於或等於開始時間';
    return e;
  };

  const updateStartedAt = (value: string) => {
    setStartedAt(value);
    setErrs(prev => ({
      ...prev,
      started_at: undefined,
      ended_at: isInvalidIncidentRange(value, endedAt) ? '結束時間必須大於或等於開始時間' : undefined,
    }));
  };

  const updateEndedAt = (value: string) => {
    setEndedAt(value);
    setErrs(prev => ({
      ...prev,
      ended_at: isInvalidIncidentRange(startedAt, value) ? '結束時間必須大於或等於開始時間' : undefined,
    }));
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrs(e); return; }
    onSubmit({
      source: source!,
      incident_type: type!,
      started_at: startedAt + ':00+08:00',
      ended_at: endedAt ? endedAt + ':00+08:00' : null,
      affected_range: affectedRange,
      note,
    });
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#F4F2E9', borderRadius: 20, padding: 28,
          width: 'min(660px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
            {initial ? '編輯異常事件' : '記錄 SFTP 傳輸異常事件'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={18} color="#999" />
          </button>
        </div>

        {/* Form */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 2 }}>

          {/* Row 1: Source + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>資料來源 *</label>
              <Select
                options={INCIDENT_SOURCE_OPTIONS}
                value={INCIDENT_SOURCE_OPTIONS.find(o => o.value === source) ?? null}
                onChange={opt => { setSource(opt?.value ?? null); clearErr('source'); }}
                styles={{
                  ...selectStyles,
                  control: (b, s) => ({
                    ...(selectStyles.control(b, s) as object),
                    borderColor: errs.source ? '#e57373' : s.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)',
                  }),
                }}
                placeholder="選擇來源"
                isSearchable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
              {errs.source && <div style={errStyle}>{errs.source}</div>}
            </div>
            <div>
              <label style={labelStyle}>異常類型 *</label>
              <Select
                options={INCIDENT_TYPE_OPTIONS}
                value={INCIDENT_TYPE_OPTIONS.find(o => o.value === type) ?? null}
                onChange={opt => { setType(opt?.value ?? null); clearErr('incident_type'); }}
                styles={{
                  ...selectStyles,
                  control: (b, s) => ({
                    ...(selectStyles.control(b, s) as object),
                    borderColor: errs.incident_type ? '#e57373' : s.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)',
                  }),
                }}
                placeholder="選擇類型"
                isSearchable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
              {errs.incident_type && <div style={errStyle}>{errs.incident_type}</div>}
            </div>
          </div>

          {/* Row 2: Started at + Ended at */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>異常開始時間 *</label>
              <DateTimePicker
                value={startedAt}
                onChange={updateStartedAt}
                error={errs.started_at}
                onClearErr={() => clearErr('started_at')}
              />
              {errs.started_at && <div style={errStyle}>{errs.started_at}</div>}
            </div>
            <div>
              <label style={labelStyle}>異常結束時間</label>
              <DateTimePicker
                value={endedAt}
                onChange={updateEndedAt}
                error={errs.ended_at}
                onClearErr={() => clearErr('ended_at')}
              />
              {errs.ended_at
                ? <div style={errStyle}>{errs.ended_at}</div>
                : <div style={hintStyle}>尚未恢復請留空</div>
              }
            </div>
          </div>

          {/* Affected range */}
          <div>
            <label style={labelStyle}>受影響資料時間範圍說明</label>
            <input
              type="text"
              style={inputStyle}
              value={affectedRange}
              placeholder="例：5/10 14:00~15:00 整點資料未傳送"
              maxLength={500}
              onChange={e => setAffectedRange(e.target.value)}
            />
          </div>

          {/* Note */}
          <div>
            <label style={labelStyle}>備註（選填）</label>
            <textarea
              style={{ ...inputStyle, height: 80, resize: 'vertical' as const, fontFamily: 'inherit' }}
              value={note}
              placeholder="補充說明..."
              maxLength={1000}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, flexShrink: 0 }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
            backgroundColor: 'transparent', color: '#666',
            fontSize: 13, cursor: 'pointer',
          }}>取消</button>
          <button onClick={handleSubmit} style={{
            padding: '9px 20px', borderRadius: 10,
            border: 'none', backgroundColor: '#6abe74',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{initial ? '儲存變更' : '確認送出'}</button>
        </div>
      </div>
    </div>
  );
}
