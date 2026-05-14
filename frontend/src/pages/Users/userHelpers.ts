import type { StylesConfig } from "react-select";

export interface UserRow {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  roleCode: string;
  organization?: string;
  isActive: boolean;
  lastLogin?: string;
  uploadQuotaGb: number;
}

export const roleConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  system_admin: {
    label: "系統管理員",
    color: "#2d6a4f",
    bg: "rgba(45,106,79,0.12)",
  },
  data_manager: {
    label: "資料管理員",
    color: "#6abe74",
    bg: "rgba(106,190,116,0.12)",
  },
  readonly: {
    label: "唯讀使用者",
    color: "#a0a98f",
    bg: "rgba(160,169,143,0.15)",
  },
};

export const roleOptions = Object.entries(roleConfig).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  color: cfg.color,
  bg: cfg.bg,
}));

export type RoleOption = (typeof roleOptions)[number];

export const emptyForm = {
  fullName: "",
  username: "",
  email: "",
  roleCode: "readonly",
  org: "",
  quota: 10,
};

export type UserFormState = typeof emptyForm;
export type UserFormErrors = Partial<UserFormState>;

export const selectStyles: StylesConfig<RoleOption, false> = {
  control: (base, state) => ({
    ...base,
    borderRadius: 8,
    border: `1px solid ${state.isFocused ? "#6abe74" : "rgba(0,0,0,0.12)"}`,
    boxShadow: state.isFocused ? "0 0 0 2px rgba(106,190,116,0.2)" : "none",
    backgroundColor: "#fff",
    fontSize: 13,
    minHeight: 38,
    "&:hover": { borderColor: "#6abe74" },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? state.data.bg
      : state.isFocused
        ? "rgba(106,190,116,0.06)"
        : "#fff",
    color: state.isSelected ? state.data.color : "#374151",
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: 13,
    cursor: "pointer",
  }),
  singleValue: (base, state) => ({
    ...base,
    color: state.data.color,
    fontWeight: 600,
  }),
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

export function validateUserForm(form: UserFormState): UserFormErrors {
  const errors: UserFormErrors = {};
  if (!form.fullName.trim()) errors.fullName = "請輸入姓名";
  if (!form.username.trim()) errors.username = "請輸入帳號";
  if (!form.email.trim()) errors.email = "請輸入 Email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Email 格式不正確";
  }
  return errors;
}

export function formatLastLogin(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
