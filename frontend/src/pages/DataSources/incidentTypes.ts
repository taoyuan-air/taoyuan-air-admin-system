export type IncidentSource = 'NAQO' | 'WindLidar' | 'MPL';

export type IncidentTypeValue =
  | 'network_disconnect'
  | 'computer_restart'
  | 'software_update'
  | 'sftp_service_error'
  | 'power_outage'
  | 'instrument_maintenance'
  | 'hardware_failure'
  | 'manual_stop'
  | 'other';

export interface SftpIncident {
  id: number;
  source: IncidentSource;
  incident_type: IncidentTypeValue;
  started_at: string;   // ISO 8601 with +08:00
  ended_at: string | null;
  affected_range: string;
  note: string;
  reporter_name: string;
  created_at: string;
}

export const INCIDENT_TYPE_OPTIONS: { value: IncidentTypeValue; label: string }[] = [
  { value: 'network_disconnect',     label: '網路連線中斷' },
  { value: 'computer_restart',       label: '電腦重新啟動' },
  { value: 'software_update',        label: '軟體更新 / 重新安裝' },
  { value: 'sftp_service_error',     label: 'SFTP 服務異常' },
  { value: 'power_outage',           label: '站點斷電' },
  { value: 'instrument_maintenance', label: '儀器維護 / 校正' },
  { value: 'hardware_failure',       label: '硬體故障' },
  { value: 'manual_stop',            label: '人為暫停傳輸' },
  { value: 'other',                  label: '其他（請於備註說明）' },
];

export const INCIDENT_SOURCE_OPTIONS: { value: IncidentSource; label: string }[] = [
  { value: 'NAQO',      label: 'NAQO' },
  { value: 'WindLidar', label: 'WindLidar' },
  { value: 'MPL',       label: 'MPL' },
];

export const SOURCE_COLORS: Record<IncidentSource, { color: string; bg: string }> = {
  NAQO:      { color: '#4a9e55', bg: 'rgba(106,190,116,0.12)' },
  WindLidar: { color: '#4a9e55', bg: 'rgba(106,190,116,0.12)' },
  MPL:       { color: '#4a9e55', bg: 'rgba(106,190,116,0.12)' },
};

export function getTypeLabel(type: IncidentTypeValue): string {
  return INCIDENT_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}

export function fmtDt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function calcDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins} 分鐘`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h} 小時 ${m} 分鐘` : `${h} 小時`;
}

// datetime-local input value (YYYY-MM-DDTHH:mm) from ISO string
export function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}
