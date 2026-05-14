import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import Select from "react-select";
import {
  emptyForm,
  inputStyle,
  labelStyle,
  selectStyles,
  sourceTypeOptions,
  type DataSourceFormErrors,
  type DataSourceFormState,
} from "./dataSourceHelpers";

interface DataSourceFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: DataSourceFormState;
  errors: DataSourceFormErrors;
  setForm: Dispatch<SetStateAction<DataSourceFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}

export default function DataSourceFormModal({
  open,
  isEditing,
  form,
  errors,
  setForm,
  onClose,
  onSubmit,
}: DataSourceFormModalProps) {
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
          display: "flex",
          flexDirection: "column",
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
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>
            {isEditing ? "編輯資料來源" : "新增資料來源"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={18} color="#999" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>名稱 *</label>
            <input
              style={{
                ...inputStyle,
                borderColor: errors.name ? "#e57373" : "rgba(0,0,0,0.12)",
              }}
              value={form.name}
              placeholder="例：環境部空品監測網"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            {errors.name && (
              <div style={{ fontSize: 11, color: "#e57373", marginTop: 4 }}>
                {errors.name}
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>資料類型 *</label>
              <Select
                options={sourceTypeOptions}
                value={sourceTypeOptions.find((o) => o.value === form.type)}
                onChange={(opt) =>
                  setForm((prev) => ({
                    ...prev,
                    type: (opt?.value ?? "EPA") as typeof emptyForm.type,
                  }))
                }
                styles={selectStyles}
                isSearchable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
            <div>
              <label style={labelStyle}>同步頻率（分鐘）</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                max={1440}
                value={form.frequency}
                placeholder="0 = 手動"
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    frequency: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>API 端點 *</label>
            <input
              style={{
                ...inputStyle,
                borderColor: errors.endpoint
                  ? "#e57373"
                  : "rgba(0,0,0,0.12)",
                fontFamily: "monospace",
              }}
              value={form.endpoint}
              placeholder="https://api.example.com/v1/data"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, endpoint: e.target.value }))
              }
            />
            {errors.endpoint && (
              <div style={{ fontSize: 11, color: "#e57373", marginTop: 4 }}>
                {errors.endpoint}
              </div>
            )}
          </div>
        </div>

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
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#6abe74",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isEditing ? "儲存" : "新增"}
          </button>
        </div>
      </div>
    </div>
  );
}
