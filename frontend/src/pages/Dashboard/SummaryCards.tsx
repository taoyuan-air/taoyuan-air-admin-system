import Card from "../../components/Card";
import type { DashboardStat } from "./dashboardHelpers";

interface SummaryCardsProps {
  stats: DashboardStat[];
}

export default function SummaryCards({ stats }: SummaryCardsProps) {
  return (
    <div
      className="grid-4"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        marginBottom: 24,
      }}
    >
      {stats.map(({ label, value, unit, Icon }) => (
        <Card key={label} padding={20}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "rgba(106,190,116,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={18} color="#6abe74" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#374151" }}>
            {value}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
            {label} <span style={{ color: "#999" }}>{unit}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
