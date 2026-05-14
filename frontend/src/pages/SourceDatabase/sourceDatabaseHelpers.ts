import type { StylesConfig } from "react-select";

export interface DbRecord {
  uploadId: number;
  fileName: string;
  dataCategory: string;
  dataType?: string;
  station?: string;
  fileSize: number;
  uploadStatus: string;
  createdAt: string;
  username?: string;
}

export type PageSizeOption = 10 | 30 | 50 | 100 | 200 | "All";

export const DATA_TYPE_LABELS: Record<string, string> = {
  hourly_obs: "逐時觀測",
};

export const STATION_LABELS: Record<string, string> = {
  taoyuan: "桃園",
  dayuan: "大園",
  guanyin: "觀音",
  pingzhen: "平鎮",
  longtan: "龍潭",
  zhongli: "中壢",
};

export const MOCK_RECORDS: Record<string, DbRecord[]> = {
  uav: [
    { uploadId: 2, fileName: "uav_flight_20260401.csv", dataCategory: "uav", station: "taoyuan", fileSize: 12582912, uploadStatus: "completed", createdAt: "2026-04-01T08:15:00", username: "partner01" },
  ],
  naqo: [
    { uploadId: 101, fileName: "NAQO_20260401_08.json", dataCategory: "naqo", dataType: "hourly_obs", fileSize: 4096, uploadStatus: "completed", createdAt: "2026-04-01T08:05:00", username: "sftp" },
    { uploadId: 102, fileName: "NAQO_20260401_07.json", dataCategory: "naqo", dataType: "hourly_obs", fileSize: 4096, uploadStatus: "completed", createdAt: "2026-04-01T07:05:00", username: "sftp" },
    { uploadId: 103, fileName: "NAQO_20260401_06.json", dataCategory: "naqo", dataType: "hourly_obs", fileSize: 4096, uploadStatus: "failed", createdAt: "2026-04-01T06:05:00", username: "sftp" },
    { uploadId: 104, fileName: "NAQO_20260401_05.json", dataCategory: "naqo", dataType: "hourly_obs", fileSize: 4096, uploadStatus: "completed", createdAt: "2026-04-01T05:05:00", username: "sftp" },
  ],
  windlidar: [
    { uploadId: 201, fileName: "WindLidar_20260401_08.csv", dataCategory: "windlidar", dataType: "hourly_obs", fileSize: 8192, uploadStatus: "completed", createdAt: "2026-04-01T08:03:00", username: "sftp" },
    { uploadId: 202, fileName: "WindLidar_20260401_07.csv", dataCategory: "windlidar", dataType: "hourly_obs", fileSize: 8192, uploadStatus: "completed", createdAt: "2026-04-01T07:03:00", username: "sftp" },
    { uploadId: 203, fileName: "WindLidar_20260401_06.csv", dataCategory: "windlidar", dataType: "hourly_obs", fileSize: 8192, uploadStatus: "completed", createdAt: "2026-04-01T06:03:00", username: "sftp" },
  ],
  mpl: [
    { uploadId: 301, fileName: "MPL_20260401_08.csv", dataCategory: "mpl", dataType: "hourly_obs", fileSize: 6144, uploadStatus: "completed", createdAt: "2026-04-01T08:04:00", username: "sftp" },
    { uploadId: 302, fileName: "MPL_20260401_07.csv", dataCategory: "mpl", dataType: "hourly_obs", fileSize: 6144, uploadStatus: "processing", createdAt: "2026-04-01T07:04:00", username: "sftp" },
    { uploadId: 303, fileName: "MPL_20260401_06.csv", dataCategory: "mpl", dataType: "hourly_obs", fileSize: 6144, uploadStatus: "completed", createdAt: "2026-04-01T06:04:00", username: "sftp" },
  ],
};

export const PAGE_SIZE_OPTIONS: { value: PageSizeOption; label: string }[] = [
  { value: 10, label: "10 筆" },
  { value: 30, label: "30 筆" },
  { value: 50, label: "50 筆" },
  { value: 100, label: "100 筆" },
  { value: 200, label: "200 筆" },
  { value: "All", label: "全部" },
];

export const selectStyles: StylesConfig<{ value: PageSizeOption; label: string }, false> = {
  control: (base, state) => ({
    ...base,
    borderRadius: 8,
    fontSize: 13,
    minHeight: 38,
    border: `1px solid ${state.isFocused ? "#6abe74" : "rgba(0,0,0,0.12)"}`,
    boxShadow: state.isFocused ? "0 0 0 2px rgba(106,190,116,0.2)" : "none",
    backgroundColor: "#fff",
    "&:hover": { borderColor: "#6abe74" },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    cursor: "pointer",
    backgroundColor: state.isSelected ? "rgba(106,190,116,0.12)" : state.isFocused ? "rgba(106,190,116,0.06)" : "#fff",
    color: state.isSelected ? "#2d6a4f" : "#374151",
    fontWeight: state.isSelected ? 600 : 400,
  }),
  singleValue: (base) => ({ ...base, color: "#374151", fontWeight: 600 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, color: "#6abe74", padding: "0 8px" }),
  menu: (base) => ({ ...base, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", border: "1px solid rgba(106,190,116,0.2)" }),
  menuList: (base) => ({ ...base, padding: 4 }),
};

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatTime(value: string) {
  const date = new Date(value.trim().replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace("T", " ");
}

export function statusToBadge(s: string): "completed" | "processing" | "failed" {
  return s === "completed" || s === "parsed"
    ? "completed"
    : s === "failed"
      ? "failed"
      : "processing";
}
