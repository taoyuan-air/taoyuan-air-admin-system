import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import Select from "react-select";
import {
  inputStyle,
  labelStyle,
  roleOptions,
  selectStyles,
  type UserFormErrors,
  type UserFormState,
} from "./userHelpers";

interface UserFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: UserFormState;
  errors: UserFormErrors;
  apiError: string;
  submitting: boolean;
  setForm: Dispatch<SetStateAction<UserFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}

export default function UserFormModal({
  open,
  isEditing,
  form,
  errors,
  apiError,
  submitting,
  setForm,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#F4F2E9",
          borderRadius: 20,
          padding: 28,
          width: "min(480px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>
            {isEditing ? "編輯使用者" : "新增使用者"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} color="#999" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>姓名 *</label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: errors.fullName
                    ? "#e57373"
                    : "rgba(0,0,0,0.12)",
                }}
                value={form.fullName}
                placeholder="請輸入姓名"
                onChange={(e) =>
                  setForm((p) => ({ ...p, fullName: e.target.value }))
                }
              />
              {errors.fullName && (
                <div style={{ fontSize: 11, color: "#e57373", marginTop: 4 }}>
                  {errors.fullName}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>帳號 *</label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: errors.username
                    ? "#e57373"
                    : "rgba(0,0,0,0.12)",
                }}
                value={form.username}
                placeholder="請輸入帳號"
                disabled={isEditing}
                onChange={(e) =>
                  setForm((p) => ({ ...p, username: e.target.value }))
                }
              />
              {errors.username && (
                <div style={{ fontSize: 11, color: "#e57373", marginTop: 4 }}>
                  {errors.username}
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email *</label>
            <input
              style={{
                ...inputStyle,
                borderColor: errors.email ? "#e57373" : "rgba(0,0,0,0.12)",
              }}
              value={form.email}
              placeholder="example@taoyuan.gov.tw"
              type="email"
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
            />
            {errors.email && (
              <div style={{ fontSize: 11, color: "#e57373", marginTop: 4 }}>
                {errors.email}
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>角色 *</label>
              <Select
                options={roleOptions}
                value={roleOptions.find((o) => o.value === form.roleCode)}
                onChange={(opt) =>
                  setForm((p) => ({
                    ...p,
                    roleCode: opt?.value ?? "readonly",
                    quota: opt?.value === "readonly" ? 0 : p.quota,
                  }))
                }
                styles={selectStyles}
                isSearchable={false}
                formatOptionLabel={(opt) => (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      color: opt.color,
                      backgroundColor: opt.bg,
                    }}
                  >
                    {opt.label}
                  </span>
                )}
              />
            </div>
            <div>
              <label style={labelStyle}>上傳配額 (GB)</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                max={1000}
                value={form.quota}
                disabled={form.roleCode === "readonly"}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quota: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>組織</label>
            <input
              style={inputStyle}
              value={form.org}
              placeholder="所屬組織（選填）"
              onChange={(e) =>
                setForm((p) => ({ ...p, org: e.target.value }))
              }
            />
          </div>
        </div>

        {apiError && (
          <div
            style={{
              marginTop: 16,
              padding: "8px 12px",
              backgroundColor: "#fef2f2",
              borderRadius: 8,
              fontSize: 13,
              color: "#dc2626",
              border: "1px solid #fecaca",
            }}
          >
            {apiError}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 24,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              backgroundColor: "transparent",
              color: "#666",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "none",
              backgroundColor: submitting ? "#a3d9a8" : "#6abe74",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "處理中..." : isEditing ? "儲存" : "新增"}
          </button>
        </div>
      </div>
    </div>
  );
}
