import { useEffect, useState } from "react";
import Header from "../../components/Layout/Header";
import { isDemoMode } from "../../config/api";
import { useAppData } from "../../contexts/AppDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { uploadService } from "../../services/uploadService";
import RecentUploadsTable from "./RecentUploadsTable";
import SourceStatusList from "./SourceStatusList";
import SummaryCards from "./SummaryCards";
import {
  STATION_LABELS,
  buildDashboardStats,
  formatSize,
  toDashboardSourceStatuses,
  toRecentUploadRecords,
} from "./dashboardHelpers";

export default function Dashboard() {
  const { sources, stations, uploadHistory, setUploadHistory } = useAppData();
  const { token } = useAuth();
  const [todayUploads, setTodayUploads] = useState(0);

  useEffect(() => {
    if (isDemoMode || !token) return;
    const today = new Date().toISOString().slice(0, 10);

    uploadService.getHistory(token, { page: "1", limit: "9999", search: today }).then((res) => {
      setTodayUploads(
        res.records.filter(
          (record) => record.createdAt.startsWith(today) && record.uploadStatus === "completed",
        ).length,
      );
    }).catch(() => {});

    uploadService.getHistory(token, { page: "1", limit: "5" }).then((res) => {
      setUploadHistory(
        res.records.map((record) => ({
          id: record.uploadId,
          name: record.fileName,
          size: formatSize(record.fileSize),
          status:
            record.uploadStatus === "completed"
              ? "completed"
              : record.uploadStatus === "failed"
                ? "failed"
                : "processing",
          time: record.createdAt,
          user: record.fileName,
          station: STATION_LABELS[record.station] ?? record.station,
        })),
      );
    }).catch(() => {});
  }, [token, setUploadHistory]);

  const stats = buildDashboardStats({
    todayUploads,
    activeSources: sources.length,
    activeStations: stations.length,
    alerts: 0,
  });
  const dashboardSources = toDashboardSourceStatuses(sources);
  const recentUploads = toRecentUploadRecords(uploadHistory);

  return (
    <div>
      <Header title="系統儀表板" subtitle="桃園市空氣污染監測後台管控系統" />

      <SummaryCards stats={stats} />

      <div
        className="grid-2"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
      >
        <SourceStatusList sources={dashboardSources} />
        <RecentUploadsTable uploads={recentUploads} />
      </div>
    </div>
  );
}
