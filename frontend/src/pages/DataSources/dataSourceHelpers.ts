import type { StylesConfig } from "react-select";
import type { SourceRecord } from "../../contexts/AppDataContext";

export type SourceSubPage = "sources" | "incidents";

export interface SyncLog {
  time: string;
  status: "success" | "error" | "pending";
  message: string;
}

export interface SftpLog {
  time: string;
  fileName: string;
  dataTime: string;
  status: "parsed" | "failed" | "received";
  errorMsg?: string;
}

export const mockLogs: Record<string, SyncLog[]> = {
  "1": [
    {
      time: "2026-04-01 06:30",
      status: "pending",
      message: "等待光達系統回應中...",
    },
    {
      time: "2026-04-01 04:30",
      status: "success",
      message: "同步成功，取得點雲資料 245 MB",
    },
  ],
  "2": [
    { time: "2026-03-31 15:00", status: "error", message: "連線逾時，無人機系統離線" },
    { time: "2026-03-31 13:00", status: "error", message: "連線逾時，無人機系統離線" },
    { time: "2026-03-31 11:00", status: "success", message: "同步成功，取得飛行資料 12 MB" },
  ],
  "3": [
    { time: "2026-04-01 08:30", status: "success", message: "同步成功，取得 1,240 筆資料" },
    { time: "2026-04-01 07:30", status: "success", message: "同步成功，取得 1,198 筆資料" },
    { time: "2026-04-01 06:30", status: "error", message: "HTTP 503 Service Unavailable" },
    { time: "2026-04-01 05:30", status: "success", message: "同步成功，取得 1,215 筆資料" },
  ],
  "4": [
    { time: "2026-04-01 08:25", status: "success", message: "同步成功，取得 88 筆觀測資料" },
    { time: "2026-04-01 07:55", status: "success", message: "同步成功，取得 91 筆觀測資料" },
    { time: "2026-04-01 07:25", status: "success", message: "同步成功，取得 87 筆觀測資料" },
  ],
  "5": [
    { time: "2026-04-01 08:28", status: "success", message: "同步成功，取得 320 筆監測資料" },
    { time: "2026-04-01 08:13", status: "success", message: "同步成功，取得 318 筆監測資料" },
    { time: "2026-04-01 07:58", status: "error", message: "JSON 解析錯誤：Unexpected token" },
    { time: "2026-04-01 07:43", status: "success", message: "同步成功，取得 315 筆監測資料" },
  ],
};

export const mockSftpLogs: Record<string, SftpLog[]> = {
  "6": [
    { time: "2026-04-01 08:05", fileName: "NAQO_20260401_08.json", dataTime: "2026-04-01 08:00", status: "parsed" },
    { time: "2026-04-01 07:05", fileName: "NAQO_20260401_07.json", dataTime: "2026-04-01 07:00", status: "parsed" },
    { time: "2026-04-01 06:05", fileName: "NAQO_20260401_06.json", dataTime: "2026-04-01 06:00", status: "failed", errorMsg: "欄位缺失：pm25" },
    { time: "2026-04-01 05:05", fileName: "NAQO_20260401_05.json", dataTime: "2026-04-01 05:00", status: "parsed" },
  ],
  "7": [
    { time: "2026-04-01 08:03", fileName: "WindLidar_20260401_08.csv", dataTime: "2026-04-01 08:00", status: "parsed" },
    { time: "2026-04-01 07:03", fileName: "WindLidar_20260401_07.csv", dataTime: "2026-04-01 07:00", status: "parsed" },
    { time: "2026-04-01 06:03", fileName: "WindLidar_20260401_06.csv", dataTime: "2026-04-01 06:00", status: "parsed" },
  ],
  "8": [
    { time: "2026-04-01 08:04", fileName: "MPL_20260401_08.csv", dataTime: "2026-04-01 08:00", status: "parsed" },
    { time: "2026-04-01 07:04", fileName: "MPL_20260401_07.csv", dataTime: "2026-04-01 07:00", status: "received" },
    { time: "2026-04-01 06:04", fileName: "MPL_20260401_06.csv", dataTime: "2026-04-01 06:00", status: "parsed" },
  ],
};

export const SOURCE_TYPES = [
  "EPA",
  "CWA",
  "IoT",
  "UAV",
  "WindProfiler",
  "SFTP",
] as const;

export const sourceTypeOptions = SOURCE_TYPES.map((type) => ({
  value: type,
  label: type,
}));

export type SourceTypeOption = (typeof sourceTypeOptions)[number];

export const emptyForm = {
  name: "",
  type: "EPA" as SourceRecord["type"],
  endpoint: "",
  frequency: 60,
};

export type DataSourceFormState = typeof emptyForm;
export type DataSourceFormErrors = Partial<DataSourceFormState>;

export const selectStyles: StylesConfig<SourceTypeOption, false> = {
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
    backgroundColor: state.isSelected
      ? "rgba(106,190,116,0.15)"
      : state.isFocused
        ? "rgba(106,190,116,0.06)"
        : "#fff",
    color: state.isSelected ? "#2d6a4f" : "#374151",
    fontWeight: state.isSelected ? 600 : 400,
  }),
  singleValue: (base) => ({ ...base, color: "#374151", fontWeight: 600 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#6abe74",
    padding: "0 8px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 10,
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    border: "1px solid rgba(106,190,116,0.2)",
  }),
  menuList: (base) => ({ ...base, padding: 4 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

export const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.12)",
  fontSize: 13,
  color: "#374151",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box" as const,
};

export const labelStyle = {
  display: "block" as const,
  fontSize: 12,
  color: "#666",
  marginBottom: 6,
  fontWeight: 600 as const,
};

export function validateDataSourceForm(
  form: DataSourceFormState,
): DataSourceFormErrors {
  const errors: DataSourceFormErrors = {};
  if (!form.name.trim()) errors.name = "請輸入名稱";
  if (!form.endpoint.trim()) errors.endpoint = "請輸入 API 端點";
  else if (!/^https?:\/\/.+/.test(form.endpoint.trim())) {
    errors.endpoint = "請輸入有效的 URL（http/https）";
  }
  return errors;
}

export function databaseCategoryForSource(source: SourceRecord): string {
  const categoryMap: Record<string, string> = {
    "6": "naqo",
    "7": "windlidar",
    "8": "mpl",
  };
  return categoryMap[source.id] ?? source.type.toLowerCase();
}
