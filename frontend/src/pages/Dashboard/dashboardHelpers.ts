import { AlertCircle, Database, Radio, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HistoryRecord, SourceRecord } from "../../contexts/AppDataContext";

export interface DashboardStat {
  label: string;
  value: number;
  unit: string;
  Icon: LucideIcon;
}

export interface DashboardSourceStatus {
  name: string;
  status: SourceRecord["status"];
  lastSync: string;
}

export const STATION_LABELS: Record<string, string> = {
  taoyuan: "桃園",
  dayuan: "大園",
  guanyin: "觀音",
  pingzhen: "平鎮",
  longtan: "龍潭",
  zhongli: "中壢",
};

export function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function buildDashboardStats({
  todayUploads,
  activeSources,
  activeStations,
  alerts,
}: {
  todayUploads: number;
  activeSources: number;
  activeStations: number;
  alerts: number;
}): DashboardStat[] {
  return [
    { label: "今日上傳檔案", value: todayUploads, unit: "個", Icon: Upload },
    { label: "活躍資料來源", value: activeSources, unit: "個", Icon: Database },
    { label: "監測測站", value: activeStations, unit: "座", Icon: Radio },
    { label: "未處理警報", value: alerts, unit: "則", Icon: AlertCircle },
  ];
}

export function toRecentUploadRecords(records: HistoryRecord[]) {
  return records.slice(0, 5);
}

export function toDashboardSourceStatuses(
  sources: SourceRecord[],
): DashboardSourceStatus[] {
  return sources.slice(0, 5).map((source) => ({
    name: source.name,
    status: source.status,
    lastSync: source.lastSync,
  }));
}
