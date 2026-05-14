export const ALLOWED_EXTS = [".txt", ".csv"];

export const STATION_OPTIONS = [
  "桃園",
  "大園",
  "觀音",
  "平鎮",
  "龍潭",
  "中壢",
] as const;

export type StationOption = (typeof STATION_OPTIONS)[number];
export type StationSlug =
  | "taoyuan"
  | "dayuan"
  | "guanyin"
  | "pingzhen"
  | "longtan"
  | "zhongli";

export const STATION_DISTRICTS: Record<StationOption, string> = {
  桃園: "桃園市桃園區",
  大園: "桃園市大園區",
  觀音: "桃園市觀音區",
  平鎮: "桃園市平鎮區",
  龍潭: "桃園市龍潭區",
  中壢: "桃園市中壢區",
};

export const STATION_SLUGS: Record<StationOption, StationSlug> = {
  桃園: "taoyuan",
  大園: "dayuan",
  觀音: "guanyin",
  平鎮: "pingzhen",
  龍潭: "longtan",
  中壢: "zhongli",
};

export const STATION_LABELS: Record<string, StationOption> = {
  taoyuan: "桃園",
  dayuan: "大園",
  guanyin: "觀音",
  pingzhen: "平鎮",
  longtan: "龍潭",
  zhongli: "中壢",
};

export interface StagedFile {
  id: string;
  file: File;
}

export interface ValidationError {
  fileName: string;
  reason: "ext" | "dup";
  detail: string;
}

export interface UploadingFile {
  id: string;
  uploadId: number;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "failed";
}

export interface UploadResult {
  id: string;
  file: File;
  status: "completed" | "failed";
}

export type PageSizeOption = 10 | 30 | 50 | 100 | 200 | "All";

export const PAGE_SIZE_OPTIONS: PageSizeOption[] = [
  10,
  30,
  50,
  100,
  200,
  "All",
];

export function formatStation(value?: string): string | undefined {
  if (!value) return undefined;
  return STATION_LABELS[value] ?? value;
}

export function repairMojibakeText(value: string): string {
  const suspicious = /[ÃÂÄÅÆÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÜàáâãäåæèéêëìíîïòóôõùúûü�]/.test(
    value,
  );
  if (!suspicious) return value;

  try {
    const repaired = decodeURIComponent(escape(value));
    return repaired !== value ? repaired : value;
  } catch {
    return value;
  }
}

export function parseHistoryDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(value.trim().replace(" ", "T"));
}

export function formatHistoryTime(value: string | Date): string {
  const date = parseHistoryDate(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
