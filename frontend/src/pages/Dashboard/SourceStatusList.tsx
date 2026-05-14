import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import type { DashboardSourceStatus } from "./dashboardHelpers";

interface SourceStatusListProps {
  sources: DashboardSourceStatus[];
}

export default function SourceStatusList({ sources }: SourceStatusListProps) {
  return (
    <Card>
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 16,
        }}
      >
        資料來源狀態
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sources.map((source) => (
          <div
            key={source.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              backgroundColor: "rgba(106,190,116,0.04)",
              borderRadius: 12,
              border: "1px solid rgba(106,190,116,0.1)",
            }}
          >
            <div>
              <div
                style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}
              >
                {source.name}
              </div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                最後同步：{source.lastSync}
              </div>
            </div>
            <StatusBadge status={source.status} />
          </div>
        ))}
      </div>
    </Card>
  );
}
