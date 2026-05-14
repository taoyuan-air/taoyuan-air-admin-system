import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import type { HistoryRecord } from "../../contexts/AppDataContext";

interface RecentUploadsTableProps {
  uploads: HistoryRecord[];
}

export default function RecentUploadsTable({ uploads }: RecentUploadsTableProps) {
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
        最近上傳記錄
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {uploads.map((upload) => (
          <div
            key={upload.id}
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {upload.name}
              </div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                {upload.station ?? "未指定測站"} · {upload.size} · {upload.time.slice(11, 16)}
              </div>
            </div>
            <StatusBadge status={upload.status} />
          </div>
        ))}
      </div>
    </Card>
  );
}
