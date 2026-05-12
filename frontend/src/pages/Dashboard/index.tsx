import { useEffect, useState } from "react";
import { Upload, Database, Radio, AlertCircle } from "lucide-react";
import Card from "../../components/Card";
import Header from "../../components/Layout/Header";
import StatusBadge from "../../components/StatusBadge";
import { useAppData } from "../../contexts/AppDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { uploadService } from "../../services/uploadService";
import { isDemoMode } from "../../config/api";

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATION_LABELS: Record<string, string> = {
  taoyuan: "桃園",
  dayuan: "大園",
  guanyin: "觀音",
  pingzhen: "平鎮",
  longtan: "龍潭",
  zhongli: "中壢",
};

export default function Dashboard() {
  const { sources, stations, uploadHistory, setUploadHistory } = useAppData();
  const { token } = useAuth();
  const [todayUploads, setTodayUploads] = useState(0);

  useEffect(() => {
    if (isDemoMode || !token) return;
    const today = new Date().toISOString().slice(0, 10);
    // fetch 今日上傳數量
    uploadService.getHistory(token, { page: "1", limit: "9999", search: today }).then((res) => {
      setTodayUploads(
        res.records.filter(
          (r) => r.createdAt.startsWith(today) && r.uploadStatus === "completed"
        ).length
      );
    }).catch(() => {});
    // fetch 最近 5 筆顯示
    uploadService.getHistory(token, { page: "1", limit: "5" }).then((res) => {
      setUploadHistory(
        res.records.map((r) => ({
          id: r.uploadId,
          name: r.fileName,
          size: formatSize(r.fileSize),
          status:
            r.uploadStatus === "completed"
              ? "completed"
              : r.uploadStatus === "failed"
                ? "failed"
                : "processing",
          time: r.createdAt,
          user: r.fileName,
          station: STATION_LABELS[r.station] ?? r.station,
        }))
      );
    }).catch(() => {});
  }, [token, setUploadHistory]);

  const activeSources = sources.length;
  const activeStations = stations.length;
  const alerts = 0;

  const stats = [
    { label: "今日上傳檔案", value: todayUploads, unit: "個", Icon: Upload },
    { label: "活躍資料來源", value: activeSources, unit: "個", Icon: Database },
    { label: "監測測站", value: activeStations, unit: "座", Icon: Radio },
    { label: "未處理警報", value: alerts, unit: "則", Icon: AlertCircle },
  ];

  const recentUploads = uploadHistory.slice(0, 5);

  // Dashboard 資料來源狀態只顯示前 5 筆
  const dashboardSources = sources.slice(0, 5).map((s) => ({
    name: s.name,
    type: s.type,
    status: s.status,
    lastSync: s.lastSync,
  }));

  return (
    <div>
      <Header title="系統儀表板" subtitle="桃園市空氣污染監測後台管控系統" />

      {/* Stats */}
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

      <div
        className="grid-2"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
      >
        {/* Data Sources */}
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
            {dashboardSources.map((ds) => (
              <div
                key={ds.name}
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
                    {ds.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                    最後同步：{ds.lastSync}
                  </div>
                </div>
                <StatusBadge status={ds.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Uploads */}
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
            {recentUploads.map((u) => (
              <div
                key={u.id}
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
                    {u.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                    {u.station ?? "未指定測站"} · {u.size} · {u.time.slice(11, 16)}
                  </div>
                </div>
                <StatusBadge status={u.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
