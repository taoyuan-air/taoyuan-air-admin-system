import { Check, RefreshCw } from 'lucide-react';
import Select from 'react-select';
import DatePicker from '../../components/DatePicker';
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
        <DatePicker value={date} onChange={onDateChange} />
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
      `}</style>
    </div>
  );
}
