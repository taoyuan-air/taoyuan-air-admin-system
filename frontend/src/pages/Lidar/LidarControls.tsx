import { useState } from 'react';
import { Calendar, Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Select from 'react-select';
import type { CSSProperties } from 'react';
import type { PanelKey, LidarStation } from '../../types/lidar';

const PANEL_LABELS: Record<PanelKey, string> = {
  nrb: 'NRB',
  depol: 'Depol Ratio',
  temperature: 'Temperature',
  backgroundEnergy: 'Background / Energy',
};

const HEIGHT_OPTIONS = [
  { value: 0.5, label: '0.5 km' },
  { value: 1, label: '1 km' },
  { value: 2, label: '2 km' },
  { value: 5, label: '5 km' },
];

const ALL_PANELS: PanelKey[] = ['nrb', 'depol', 'temperature', 'backgroundEnergy'];
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

interface Props {
  stations: LidarStation[];
  station: string;
  date: string;
  heightMax: number;
  panels: PanelKey[];
  loading: boolean;
  onStationChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onHeightChange: (v: number) => void;
  onPanelsChange: (v: PanelKey[]) => void;
  onApply: () => void;
}

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

const controlLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#666',
  marginBottom: 6,
  fontWeight: 600,
};

const selectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    borderRadius: 8,
    minHeight: 38,
    border: `1px solid ${state.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
    boxShadow: state.isFocused ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    '&:hover': { borderColor: '#6abe74' },
  }),
  option: (base: object, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    fontSize: 14,
    cursor: 'pointer',
    backgroundColor: state.isSelected
      ? 'rgba(106,190,116,0.15)'
      : state.isFocused
        ? 'rgba(106,190,116,0.06)'
        : '#fff',
    color: state.isSelected ? '#2d6a4f' : '#374151',
    fontWeight: state.isSelected ? 600 : 400,
  }),
  singleValue: (base: object) => ({ ...base, color: '#374151' }),
  placeholder: (base: object) => ({ ...base, color: '#aaa', fontSize: 14 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: object) => ({ ...base, color: '#6abe74', padding: '0 8px' }),
  menu: (base: object) => ({
    ...base,
    borderRadius: 10,
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    border: '1px solid rgba(106,190,116,0.2)',
    overflow: 'hidden',
  }),
  menuList: (base: object) => ({ ...base, padding: 4 }),
  menuPortal: (base: object) => ({ ...base, zIndex: 9999 }),
  valueContainer: (base: object) => ({ ...base, padding: '0 10px' }),
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseDateInput = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const formatDateLabel = (value: string) => {
  const date = parseDateInput(value);
  if (!date) return '';

  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
};

const buildCalendarDays = (monthDate: Date) => {
  const startOffset = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

function LidarDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const selectedDate = parseDateInput(value);
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = selectedDate ?? today;
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const days = buildCalendarDays(viewMonth);
  const selectedKey = selectedDate ? toDateInputValue(selectedDate) : '';
  const todayKey = toDateInputValue(today);

  const toggleOpen = () => {
    if (!open) {
      const target = selectedDate ?? today;
      setViewMonth(new Date(target.getFullYear(), target.getMonth(), 1));
    }
    setOpen(prev => !prev);
    setFocused(true);
  };

  const selectDate = (date: Date) => {
    onChange(toDateInputValue(date));
    setOpen(false);
  };

  const shiftMonth = (amount: number) => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };

  const setToday = () => {
    const current = new Date();
    setViewMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    onChange(toDateInputValue(current));
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleOpen}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          minHeight: 38,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: `1px solid ${focused || open ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 8,
          backgroundColor: '#fff',
          boxShadow: focused || open ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
          color: '#374151',
          padding: '8px 10px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <Calendar size={15} color="#6abe74" />
        <span style={{ flex: 1, fontSize: 14, fontWeight: value ? 600 : 400, color: value ? '#374151' : '#aaa' }}>
          {formatDateLabel(value) || '選擇日期'}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: 300,
            padding: 16,
            borderRadius: 14,
            backgroundColor: '#fff',
            border: '1px solid rgba(106,190,116,0.2)',
            boxShadow: '0 14px 34px rgba(45,106,79,0.16)',
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#374151' }}>
              {viewMonth.getFullYear()} 年 {viewMonth.getMonth() + 1} 月
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ icon: <ChevronLeft size={16} />, onClick: () => shiftMonth(-1), label: '上一個月' }, { icon: <ChevronRight size={16} />, onClick: () => shiftMonth(1), label: '下一個月' }].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  aria-label={btn.label}
                  onClick={btn.onClick}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    border: '1px solid rgba(0,0,0,0.08)',
                    backgroundColor: '#fff',
                    color: '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {btn.icon}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', columnGap: 5, rowGap: 5 }}>
            {WEEKDAY_LABELS.map(day => (
              <div
                key={day}
                style={{
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {day}
              </div>
            ))}

            {days.map(date => {
              const key = toDateInputValue(date);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const muted = date.getMonth() !== viewMonth.getMonth();

              return (
                <button
                  key={key}
                  type="button"
                  className={`lidar-calendar-day${isSelected ? ' is-selected' : ''}`}
                  onClick={() => selectDate(date)}
                  style={{
                    height: 31,
                    borderRadius: 8,
                    border: isSelected || isToday ? '1px solid rgba(106,190,116,0.45)' : '1px solid transparent',
                    backgroundColor: isSelected ? 'rgba(106,190,116,0.12)' : 'transparent',
                    color: muted ? '#aaa' : '#374151',
                    fontSize: 13,
                    fontWeight: isSelected || isToday ? 800 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={setToday}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#4a9e55',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              設為今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LidarControls({
  stations,
  station,
  date,
  heightMax,
  panels,
  loading,
  onStationChange,
  onDateChange,
  onHeightChange,
  onPanelsChange,
  onApply,
}: Props) {
  const stationOptions: SelectOption<string>[] = stations.map(s => ({
    value: s.name,
    label: s.name,
  }));
  const selectedStation = stationOptions.find(o => o.value === station) ?? null;
  const selectedHeight = HEIGHT_OPTIONS.find(o => o.value === heightMax) ?? HEIGHT_OPTIONS[0];

  function togglePanel(key: PanelKey) {
    onPanelsChange(
      panels.includes(key) ? panels.filter(p => p !== key) : [...panels, key],
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid rgba(106,190,116,0.2)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 18,
        alignItems: 'flex-start',
        boxShadow: '0 6px 20px rgba(45,106,79,0.06)',
      }}
    >
      <div style={{ width: 170 }}>
        <label style={controlLabelStyle}>站點</label>
        <Select<SelectOption<string>, false>
          value={selectedStation}
          options={stationOptions}
          onChange={option => onStationChange(option?.value ?? '')}
          placeholder="選擇站點"
          styles={selectStyles}
          menuPortalTarget={document.body}
          isSearchable={false}
        />
      </div>

      <div style={{ width: 190 }}>
        <label style={controlLabelStyle}>日期（台灣時間）</label>
        <LidarDateField value={date} onChange={onDateChange} />
      </div>

      <div style={{ width: 140 }}>
        <label style={controlLabelStyle}>高度上限</label>
        <Select<SelectOption<number>, false>
          value={selectedHeight}
          options={HEIGHT_OPTIONS}
          onChange={option => {
            if (option) onHeightChange(option.value);
          }}
          styles={selectStyles}
          menuPortalTarget={document.body}
          isSearchable={false}
        />
      </div>

      <div style={{ minWidth: 380, flex: '1 1 420px' }}>
        <label style={controlLabelStyle}>顯示面板</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ALL_PANELS.map(key => {
            const active = panels.includes(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePanel(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  minHeight: 34,
                  padding: '6px 11px',
                  border: `1px solid ${active ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: 8,
                  backgroundColor: active ? 'rgba(106,190,116,0.12)' : '#fff',
                  color: active ? '#2d6a4f' : '#4b5563',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
                }}
                aria-pressed={active}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `1px solid ${active ? '#6abe74' : 'rgba(0,0,0,0.18)'}`,
                    backgroundColor: active ? '#6abe74' : '#fff',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                  }}
                >
                  {active && <Check size={12} strokeWidth={3} />}
                </span>
                {PANEL_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onApply}
        disabled={loading || !station || !date}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 40,
          padding: '0 20px',
          backgroundColor: loading || !station || !date ? '#9ca3af' : '#6abe74',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          cursor: loading || !station || !date ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s, transform 0.15s',
          marginLeft: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <RefreshCw size={16} style={{ animation: loading ? 'lidar-spin 1s linear infinite' : 'none' }} />
        {loading ? '載入中' : '套用'}
      </button>

      <style>{`
        @keyframes lidar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .lidar-calendar-day {
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .lidar-calendar-day:hover {
          background-color: rgba(106,190,116,0.1) !important;
          border-color: rgba(106,190,116,0.45) !important;
          color: #2d6a4f !important;
        }

        .lidar-calendar-day.is-selected:hover {
          background-color: rgba(106,190,116,0.16) !important;
        }
      `}</style>
    </div>
  );
}
