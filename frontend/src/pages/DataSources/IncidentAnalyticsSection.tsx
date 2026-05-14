import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart3, Download, LineChart, PieChart } from 'lucide-react';
import Select from 'react-select';
import Card from '../../components/Card';
import DatePicker from '../../components/DatePicker';
import {
  INCIDENT_SOURCE_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  getTypeLabel,
} from './incidentTypes';
import type { CSSProperties } from 'react';
import type { IncidentSource, IncidentTypeValue, SftpIncident } from './incidentTypes';

interface Props {
  incidents: SftpIncident[];
}

type RangePreset = '7d' | '30d' | 'month' | 'all' | 'custom';
type GroupBy = 'day' | 'week' | 'month';
type Metric = 'count' | 'duration';
type StatusFilter = 'ongoing' | 'resolved';
type SummaryPart = string | { text: string; strong: true };
type SummaryLine = SummaryPart[];

const selectStyles = {
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

const statusOpts = [
  { value: 'ongoing' as const, label: '異常中' },
  { value: 'resolved' as const, label: '已復原' },
];

const rangeOpts: { value: RangePreset; label: string }[] = [
  { value: '30d', label: '近 30 天' },
  { value: '7d', label: '近 7 天' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '全部時間' },
  { value: 'custom', label: '自訂區間' },
];

const groupOpts: { value: GroupBy; label: string }[] = [
  { value: 'day', label: '每日' },
  { value: 'week', label: '每週' },
  { value: 'month', label: '每月' },
];

const metricOpts: { value: Metric; label: string }[] = [
  { value: 'count', label: '事件件數' },
  { value: 'duration', label: '中斷時間' },
];

const chartPalette = ['#6abe74', '#f0a500', '#5b8def', '#e57373', '#8b7cf6', '#52b6a3', '#d985c2'];

const labelStyle: CSSProperties = {
  display: 'block', fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600,
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const formatDate = (date: Date) => `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;

const minutesBetween = (start: string, end: string | null) => {
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.round((endTime - startTime) / 60000));
};

const formatMinutes = (mins: number) => {
  if (!Number.isFinite(mins) || mins <= 0) return '0 分鐘';
  if (mins < 60) return `${Math.round(mins)} 分鐘`;
  const hours = mins / 60;
  return hours < 24 ? `${hours.toFixed(1)} 小時` : `${(hours / 24).toFixed(1)} 天`;
};

const bucketInfo = (date: Date, groupBy: GroupBy) => {
  if (groupBy === 'month') {
    return {
      key: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`,
      label: `${date.getFullYear()}/${pad2(date.getMonth() + 1)}`,
    };
  }
  if (groupBy === 'week') {
    const day = startOfDay(date);
    const mondayOffset = day.getDay() === 0 ? -6 : 1 - day.getDay();
    const weekStart = addDays(day, mondayOffset);
    return {
      key: `${weekStart.getFullYear()}-${pad2(weekStart.getMonth() + 1)}-${pad2(weekStart.getDate())}`,
      label: `${pad2(weekStart.getMonth() + 1)}/${pad2(weekStart.getDate())} 週`,
    };
  }
  return {
    key: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    label: `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`,
  };
};

const getRange = (preset: RangePreset, customFrom: string, customTo: string) => {
  const now = new Date();
  if (preset === 'all') return { from: null as Date | null, to: null as Date | null };
  if (preset === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: startOfDay(addDays(now, 1)) };
  if (preset === 'custom') {
    return {
      from: customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : null,
      to: customTo ? addDays(new Date(`${customTo}T00:00:00`), 1) : null,
    };
  }
  const days = preset === '7d' ? 7 : 30;
  return { from: startOfDay(addDays(now, -days + 1)), to: startOfDay(addDays(now, 1)) };
};

const getRangeLabel = (preset: RangePreset, customFrom: string, customTo: string) => {
  const { from, to } = getRange(preset, customFrom, customTo);
  if (preset === 'all') return '全部時間';
  if (preset === 'custom') {
    if (customFrom && customTo) return `${customFrom.replaceAll('-', '/')} 至 ${customTo.replaceAll('-', '/')}`;
    if (customFrom) return `${customFrom.replaceAll('-', '/')} 之後`;
    if (customTo) return `${customTo.replaceAll('-', '/')} 以前`;
    return '自訂區間';
  }
  if (!from || !to) return '全部時間';
  return `${formatDate(from)} 至 ${formatDate(addDays(to, -1))}`;
};

const percentText = (value: number, total: number) => {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

const isInvalidCustomRange = (from: string, to: string) => Boolean(from && to && from > to);
const strong = (text: string): SummaryPart => ({ text, strong: true });

function SegmentedButton<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div style={{
      display: 'inline-flex', gap: 4, padding: 3,
      borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.75)',
      border: '1px solid rgba(0,0,0,0.08)',
    }}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              padding: '7px 12px', borderRadius: 8, border: 'none',
              backgroundColor: active ? '#6abe74' : 'transparent',
              color: active ? '#fff' : '#666',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function TrendChart({ data, metric }: { data: { label: string; value: number }[]; metric: Metric }) {
  const width = 520;
  const height = 180;
  const padding = { top: 16, right: 40, bottom: 42, left: 42 };
  const max = Math.max(1, ...data.map(d => d.value));
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const points = data.map((d, i) => {
    const x = padding.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = padding.top + innerH - (d.value / max) * innerH;
    return { ...d, x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 420, height: 210 }}>
        {[0, 0.5, 1].map(tick => {
          const y = padding.top + innerH - tick * innerH;
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(0,0,0,0.06)" />
              <text x={8} y={y + 4} fontSize="10" fill="#aaa">
                {metric === 'duration' ? `${Math.round((max * tick) / 60)}h` : Math.round(max * tick)}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#6abe74" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(point => (
          <g key={`${point.label}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#fff" stroke="#6abe74" strokeWidth="2" />
            <title>{`${point.label}: ${metric === 'duration' ? formatMinutes(point.value) : `${point.value} 件`}`}</title>
          </g>
        ))}
        {points.map((point, i) => (
          (i === 0 || i === points.length - 1 || data.length <= 8) && (
            <text
              key={point.label}
              x={point.x}
              y={height - 14}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              fontSize="10"
              fill="#999"
            >
              {point.label}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 50;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segments = total > 0
    ? data.map(item => {
        const dash = (item.value / total) * circumference;
        const offset = -cumulative;
        cumulative += dash;
        return { ...item, dash, offset };
      })
    : [];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {segments.length === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} />
          ) : segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={seg.offset}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#374151' }}>{total}</span>
          <span style={{ fontSize: 11, color: '#999' }}>事件</span>
        </div>
      </div>
      <div style={{ minWidth: 180, flex: 1 }}>
        {data.length === 0 ? (
          <div style={{ fontSize: 13, color: '#999' }}>沒有符合條件的異常類型資料</div>
        ) : data.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: item.color, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            <strong style={{ fontSize: 12, color: '#374151' }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const width = 460;
  const height = 200;
  const pad = { top: 28, right: 20, bottom: 44, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const rawMax = Math.max(1, ...data.map(d => d.value));
  const max = rawMax % 2 === 0 ? rawMax : rawMax + 1;
  const n = data.length || 1;
  const slotW = innerW / n;
  const barW = Math.min(slotW * 0.48, 64);

  if (data.length === 0) {
    return <div style={{ fontSize: 13, color: '#999', padding: '24px 0' }}>沒有符合條件的來源排行資料</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 200 }}>
      {[0, 0.5, 1].map(tick => {
        const y = pad.top + innerH - tick * innerH;
        return (
          <g key={tick}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(0,0,0,0.06)" />
            <text x={8} y={y + 4} fontSize="10" fill="#aaa">{Math.round(max * tick)}</text>
          </g>
        );
      })}
      {data.map((item, i) => {
        const cx = pad.left + slotW * i + slotW / 2;
        const barH = Math.max(4, (item.value / max) * innerH);
        const x = cx - barW / 2;
        const y = pad.top + innerH - barH;
        return (
          <g key={item.label}>
            <rect x={x} y={y} width={barW} height={barH} rx={5} fill={item.color} opacity={0.85} />
            <text x={cx} y={y - 6} textAnchor="middle" fontSize="11" fill="#555" fontWeight="700">{item.value} 件</text>
            <text x={cx} y={height - 10} textAnchor="middle" fontSize="11" fill="#666">{item.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

interface ExportMeta {
  date: string;
  range: string;
  source: string;
  type: string;
  status: string;
}

export default function IncidentAnalyticsSection({ incidents }: Props) {
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [source, setSource] = useState<IncidentSource | null>(null);
  const [type, setType] = useState<IncidentTypeValue | null>(null);
  const [status, setStatus] = useState<StatusFilter | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [metric, setMetric] = useState<Metric>('count');
  const [exporting, setExporting] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const metricLabel = metricOpts.find(option => option.value === metric)?.label ?? '事件件數';
  const invalidCustomRange = rangePreset === 'custom' && isInvalidCustomRange(customFrom, customTo);

  const handleExport = async () => {
    if (!contentRef.current || exporting) return;
    const now = new Date();
    flushSync(() => {
      setExportMeta({
        date: `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
        range: getRangeLabel(rangePreset, customFrom, customTo),
        source: source ?? '全部來源',
        type: type ? getTypeLabel(type) : '全部類型',
        status: status === 'ongoing' ? '異常中' : status === 'resolved' ? '已復原' : '全部狀態',
      });
      setExporting(true);
    });
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentW = pageW - margin * 2;

      const imgData = canvas.toDataURL('image/png');
      const imgH = (canvas.height / canvas.width) * contentW;

      if (imgH <= pageH - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, contentW, imgH);
      } else {
        // 切割成多頁
        const pxPerMm = canvas.width / contentW;
        let srcYPx = 0;
        let isFirst = true;
        while (srcYPx < canvas.height) {
          if (!isFirst) pdf.addPage();
          const availH = (isFirst ? pageH : pageH) - margin * 2;
          const sliceHPx = Math.min(availH * pxPerMm, canvas.height - srcYPx);
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = Math.ceil(sliceHPx);
          slice.getContext('2d')!.drawImage(canvas, 0, srcYPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);
          pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, contentW, sliceHPx / pxPerMm);
          srcYPx += sliceHPx;
          isFirst = false;
        }
      }

      pdf.save(`異常事件分析報告_${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}.pdf`);
    } finally {
      flushSync(() => {
        setExporting(false);
        setExportMeta(null);
      });
    }
  };

  const analysis = useMemo(() => {
    if (rangePreset === 'custom' && isInvalidCustomRange(customFrom, customTo)) {
      return {
        filtered: [],
        totalDuration: 0,
        avgResolve: 0,
        ongoing: 0,
        resolvedCount: 0,
        trend: [],
        typeShare: [],
        sourceRanking: [],
        topType: '—',
        topSource: '—',
        topTypeCount: 0,
        topSourceCount: 0,
      };
    }

    const { from, to } = getRange(rangePreset, customFrom, customTo);
    const filtered = incidents.filter(incident => {
      const started = new Date(incident.started_at);
      if (from && started < from) return false;
      if (to && started >= to) return false;
      if (source && incident.source !== source) return false;
      if (type && incident.incident_type !== type) return false;
      if (status === 'ongoing' && incident.ended_at !== null) return false;
      if (status === 'resolved' && incident.ended_at === null) return false;
      return true;
    });

    const totalDuration = filtered.reduce((sum, item) => sum + minutesBetween(item.started_at, item.ended_at), 0);
    const resolved = filtered.filter(item => item.ended_at);
    const avgResolve = resolved.length
      ? resolved.reduce((sum, item) => sum + minutesBetween(item.started_at, item.ended_at), 0) / resolved.length
      : 0;
    const ongoing = filtered.filter(item => !item.ended_at).length;

    const typeCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const buckets = new Map<string, { label: string; value: number }>();
    filtered.forEach(item => {
      const itemDate = new Date(item.started_at);
      const bucket = bucketInfo(itemDate, groupBy);
      const prev = buckets.get(bucket.key);
      buckets.set(bucket.key, {
        label: bucket.label,
        value: (prev?.value ?? 0) + (metric === 'duration' ? minutesBetween(item.started_at, item.ended_at) : 1),
      });
      typeCounts.set(getTypeLabel(item.incident_type), (typeCounts.get(getTypeLabel(item.incident_type)) ?? 0) + 1);
      sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
    });

    const trend = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, bucket]) => bucket);
    const typeShare = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({ label, value, color: chartPalette[index % chartPalette.length] }));
    const sourceRanking = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({ label, value, color: chartPalette[index % chartPalette.length] }));
    const topType = typeShare[0]?.label ?? '—';
    const topSource = sourceRanking[0]?.label ?? '—';
    const topTypeCount = typeShare[0]?.value ?? 0;
    const topSourceCount = sourceRanking[0]?.value ?? 0;
    const resolvedCount = resolved.length;

    return {
      filtered,
      totalDuration,
      avgResolve,
      ongoing,
      resolvedCount,
      trend,
      typeShare,
      sourceRanking,
      topType,
      topSource,
      topTypeCount,
      topSourceCount,
    };
  }, [customFrom, customTo, groupBy, incidents, metric, rangePreset, source, status, type]);

  const summaryLines = useMemo(() => {
    if (rangePreset === 'custom' && isInvalidCustomRange(customFrom, customTo)) {
      return [[strong('自訂區間設定有誤'), '，開始日期必須小於或等於結束日期。']];
    }

    const total = analysis.filtered.length;
    const rangeLabel = getRangeLabel(rangePreset, customFrom, customTo);
    const sourceLabel = source ? `資料來源 ${source}` : '全部資料來源';
    const typeLabel = type ? `異常類型「${getTypeLabel(type)}」` : '全部異常類型';
    const statusLabel = status === 'ongoing' ? '異常中事件' : status === 'resolved' ? '已復原事件' : '全部狀態事件';

    if (total === 0) {
      return [
        [strong(rangeLabel), '、', sourceLabel, '、', typeLabel, '、', statusLabel, '下，目前沒有符合條件的 SFTP 傳輸異常事件。'],
        ['可調整時間區段、資料來源或異常類型後重新檢視統計結果。'],
      ];
    }

    const lines: SummaryLine[] = [
      [
        strong(rangeLabel), '、', sourceLabel, '、', typeLabel, '、', statusLabel,
        '下，共記錄 ', strong(`${total} 件`), ' SFTP 傳輸異常事件，其中 ',
        strong(`${analysis.ongoing} 件`), '仍為異常中、', strong(`${analysis.resolvedCount} 件`), '已復原。',
      ],
      [
        '累計中斷時間約 ', strong(formatMinutes(analysis.totalDuration)),
        '，已復原事件的平均復原時間約 ', strong(formatMinutes(analysis.avgResolve)), '。',
      ],
      [
        '主要異常類型為「', strong(analysis.topType), '」，共 ',
        strong(`${analysis.topTypeCount} 件`), '，占 ', strong(percentText(analysis.topTypeCount, total)),
        '；發生次數最高的資料來源為 ', strong(analysis.topSource), '，共 ',
        strong(`${analysis.topSourceCount} 件`), '，占 ', strong(percentText(analysis.topSourceCount, total)), '。',
      ],
    ];

    if (analysis.ongoing > 0) {
      lines.push(['目前仍有 ', strong(`${analysis.ongoing} 件`), '尚未復原，建議優先追蹤來源端連線狀態、站點設備與最近一次傳輸紀錄。']);
    } else {
      lines.push(['目前篩選範圍內事件', strong('皆已復原'), '，可作為後續例行維護與改善成效追蹤依據。']);
    }

    return lines;
  }, [analysis, customFrom, customTo, rangePreset, source, status, type]);

  return (
    <Card padding={24} style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: 'rgba(106,190,116,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 size={18} color="#4a9e55" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>異常事件分析</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 1 }}>依篩選條件產生報告用統計圖表</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: exporting ? 'not-allowed' : 'pointer',
            backgroundColor: exporting ? 'rgba(106,190,116,0.4)' : '#6abe74',
            color: '#fff', fontSize: 13, fontWeight: 700,
            transition: 'background-color 0.15s',
            flexShrink: 0,
          }}
        >
          <Download size={14} />
          {exporting ? '產生中…' : '匯出報告'}
        </button>
      </div>

      <div ref={contentRef} style={{ marginTop: 18 }}>
        {/* PDF 標頭：匯出時才顯示 */}
        {exportMeta && (
          <div style={{ marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(106,190,116,0.25)' }}>
            <div style={{ background: '#6abe74', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 0.3 }}>SFTP 傳輸異常事件分析報告</div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 3 }}>桃園國際機場空品資料管理系統</div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, textAlign: 'right', marginTop: 2 }}>
                <div>產出時間</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{exportMeta.date}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(106,190,116,0.06)', padding: '10px 18px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(106,190,116,0.15)' }}>
              <span style={{ fontSize: 11, color: '#888', fontWeight: 700 }}>篩選條件</span>
              {[exportMeta.range, exportMeta.source, exportMeta.type, exportMeta.status].map((val, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <span style={{ color: '#ccc', fontSize: 10 }}>｜</span>}
                  <span style={{ fontSize: 11, color: '#555', background: 'rgba(106,190,116,0.12)', padding: '2px 8px', borderRadius: 99 }}>{val}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
        }}>
          {[
            { label: '總事件', value: `${analysis.filtered.length} 件` },
            { label: '異常中', value: `${analysis.ongoing} 件` },
            { label: '累計中斷', value: formatMinutes(analysis.totalDuration) },
            { label: '平均復原', value: formatMinutes(analysis.avgResolve) },
          ].map(item => (
            <div key={item.label} style={{
              padding: '13px 14px', borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 5 }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#374151' }}>{item.value}</div>
            </div>
          ))}
        </div>

      {!exportMeta && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 18,
          }}>
            <div>
              <label style={labelStyle}>時間區段</label>
              <Select
                options={rangeOpts}
                value={rangeOpts.find(o => o.value === rangePreset)}
                onChange={opt => setRangePreset(opt?.value ?? '30d')}
                styles={selectStyles}
                isSearchable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
            <div>
              <label style={labelStyle}>資料來源</label>
              <Select
                options={INCIDENT_SOURCE_OPTIONS}
                value={INCIDENT_SOURCE_OPTIONS.find(o => o.value === source) ?? null}
                onChange={opt => setSource(opt?.value ?? null)}
                styles={selectStyles}
                placeholder="全部來源"
                isClearable
                isSearchable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
            <div>
              <label style={labelStyle}>異常類型</label>
              <Select
                options={INCIDENT_TYPE_OPTIONS}
                value={INCIDENT_TYPE_OPTIONS.find(o => o.value === type) ?? null}
                onChange={opt => setType(opt?.value ?? null)}
                styles={selectStyles}
                placeholder="全部類型"
                isClearable
                isSearchable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
            <div>
              <label style={labelStyle}>狀態</label>
              <Select
                options={statusOpts}
                value={statusOpts.find(o => o.value === status) ?? null}
                onChange={opt => setStatus(opt?.value ?? null)}
                styles={selectStyles}
                placeholder="全部狀態"
                isClearable
                isSearchable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          </div>

          {rangePreset === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>開始日期</label>
                <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="選擇開始日期" isClearable />
              </div>
              <div>
                <label style={labelStyle}>結束日期</label>
                <DatePicker value={customTo} onChange={setCustomTo} placeholder="選擇結束日期" isClearable />
              </div>
              {invalidCustomRange && (
                <div style={{
                  gridColumn: '1 / -1',
                  fontSize: 12,
                  color: '#e57373',
                  fontWeight: 600,
                }}>
                  開始日期必須小於或等於結束日期
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <div>
              <label style={labelStyle}>統計單位</label>
              <SegmentedButton options={groupOpts} value={groupBy} onChange={setGroupBy} />
            </div>
            <div>
              <label style={labelStyle}>趨勢指標</label>
              <SegmentedButton options={metricOpts} value={metric} onChange={setMetric} />
            </div>
          </div>
        </>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        marginTop: 18,
      }}>
        <div style={{
          padding: 16, borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(0,0,0,0.06)',
          minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <LineChart size={16} color="#4a9e55" />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>異常趨勢（{metricLabel}）</div>
          </div>
          {analysis.trend.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>沒有符合條件的趨勢資料</div>
          ) : (
            <TrendChart data={analysis.trend} metric={metric} />
          )}
        </div>

        <div style={{
          padding: 16, borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(0,0,0,0.06)',
          minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <PieChart size={16} color="#4a9e55" />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>異常類型占比</div>
          </div>
          <DonutChart data={analysis.typeShare} />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
        marginTop: 16,
      }}>
        <div style={{
          padding: 16, borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(0,0,0,0.06)',
          minWidth: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>資料來源事件排行</div>
          <ColumnChart data={analysis.sourceRanking} />
        </div>
        <div style={{
          padding: 16, borderRadius: 8,
          backgroundColor: 'rgba(106,190,116,0.08)',
          border: '1px solid rgba(106,190,116,0.18)',
          minWidth: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>報告摘要</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {summaryLines.map((line, index) => (
              <p key={index} style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: 0 }}>
                {line.map((part, partIndex) => (
                  typeof part === 'string'
                    ? <span key={partIndex}>{part}</span>
                    : <strong key={partIndex} style={{ color: '#374151', fontWeight: 800 }}>{part.text}</strong>
                ))}
              </p>
            ))}
          </div>
        </div>
      </div>
      </div>{/* end contentRef */}
    </Card>
  );
}
