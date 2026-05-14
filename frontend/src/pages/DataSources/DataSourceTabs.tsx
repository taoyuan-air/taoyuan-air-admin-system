import { AlertCircle, Database } from "lucide-react";
import type { SourceSubPage } from "./dataSourceHelpers";

interface DataSourceTabsProps {
  activeSubPage: SourceSubPage;
  onChange: (page: SourceSubPage) => void;
}

export default function DataSourceTabs({
  activeSubPage,
  onChange,
}: DataSourceTabsProps) {
  const tabs = [
    { key: "sources" as const, label: "資料來源設定", icon: <Database size={14} /> },
    { key: "incidents" as const, label: "傳輸異常事件", icon: <AlertCircle size={14} /> },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {tabs.map((tab) => {
          const active = activeSubPage === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 9,
                border: "none",
                backgroundColor: active ? "#6abe74" : "transparent",
                color: active ? "#fff" : "#666",
                fontSize: 13,
                fontWeight: active ? 700 : 600,
                cursor: "pointer",
                boxShadow: active
                  ? "0 2px 8px rgba(106,190,116,0.25)"
                  : "none",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
