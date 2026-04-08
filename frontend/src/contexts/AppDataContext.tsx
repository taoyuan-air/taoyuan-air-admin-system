/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface SourceRecord {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  frequency: number;
  active: boolean;
  lastSync: string;
  status: "success" | "error" | "pending";
}

export interface StationRecord {
  id: string;
  name: string;
  type: string;
  district: string;
  lat: number;
  lon: number;
  operator: string;
  active: boolean;
  score: number;
  calibration: string;
}

export interface HistoryRecord {
  id: number;
  name: string;
  type: string;
  size: string;
  status: "completed" | "processing" | "failed";
  time: string;
  user: string;
}

const initialSources: SourceRecord[] = [
  {
    id: "1",
    name: "環境部空品監測網",
    type: "EPA",
    endpoint: "https://data.epa.gov.tw/api/v2/aqx_p_432",
    frequency: 60,
    active: true,
    lastSync: "2026-04-01 08:30",
    status: "success",
  },
  {
    id: "2",
    name: "中央氣象署觀測",
    type: "CWA",
    endpoint: "https://opendata.cwa.gov.tw/api/v1/rest/datastore",
    frequency: 30,
    active: true,
    lastSync: "2026-04-01 08:25",
    status: "success",
  },
  {
    id: "3",
    name: "光達系統 LiDAR",
    type: "Lidar",
    endpoint: "http://lidar.internal/api/data",
    frequency: 120,
    active: true,
    lastSync: "2026-04-01 06:30",
    status: "pending",
  },
  {
    id: "4",
    name: "無人機資料系統",
    type: "UAV",
    endpoint: "http://uav.internal/api/upload",
    frequency: 0,
    active: false,
    lastSync: "2026-03-31 15:00",
    status: "error",
  },
  {
    id: "5",
    name: "IoT 微型感測器",
    type: "IoT",
    endpoint: "https://iot.taoyuan.gov.tw/api",
    frequency: 15,
    active: true,
    lastSync: "2026-04-01 08:28",
    status: "success",
  },
];

const initialStations: StationRecord[] = [
  {
    id: "S001",
    name: "桃園測站",
    type: "一般測站",
    district: "桃園區",
    lat: 24.9936,
    lon: 121.301,
    operator: "環境部",
    active: true,
    score: 95,
    calibration: "2026-03-20",
  },
  {
    id: "S002",
    name: "中壢測站",
    type: "一般測站",
    district: "中壢區",
    lat: 24.96,
    lon: 121.2247,
    operator: "環境部",
    active: true,
    score: 88,
    calibration: "2026-03-18",
  },
  {
    id: "S003",
    name: "觀音測站",
    type: "工業測站",
    district: "觀音區",
    lat: 25.0167,
    lon: 121.1,
    operator: "環境部",
    active: true,
    score: 72,
    calibration: "2026-02-25",
  },
  {
    id: "S004",
    name: "平鎮測站",
    type: "一般測站",
    district: "平鎮區",
    lat: 24.95,
    lon: 121.2167,
    operator: "環境部",
    active: true,
    score: 91,
    calibration: "2026-03-10",
  },
  {
    id: "S005",
    name: "龍潭測站",
    type: "背景測站",
    district: "龍潭區",
    lat: 24.8667,
    lon: 121.2167,
    operator: "環境部",
    active: false,
    score: 60,
    calibration: "2025-12-15",
  },
  {
    id: "S006",
    name: "大園光達站",
    type: "光達測站",
    district: "大園區",
    lat: 25.0667,
    lon: 121.1833,
    operator: "研究團隊",
    active: true,
    score: 85,
    calibration: "2026-03-25",
  },
];

const initialHistory: HistoryRecord[] = [
  {
    id: 1,
    name: "lidar_20260401_001.las",
    type: "點雲資料",
    size: "245 MB",
    status: "completed",
    time: "2026-04-01 08:32",
    user: "admin",
  },
  {
    id: 2,
    name: "uav_flight_20260401.csv",
    type: "UAV 感測器",
    size: "12 MB",
    status: "processing",
    time: "2026-04-01 08:15",
    user: "partner01",
  },
  {
    id: 3,
    name: "wind_field_20260401.nc",
    type: "風場資料",
    size: "88 MB",
    status: "completed",
    time: "2026-04-01 07:50",
    user: "admin",
  },
  {
    id: 4,
    name: "boundary_layer.json",
    type: "大氣邊界層",
    size: "5 MB",
    status: "failed",
    time: "2026-04-01 07:20",
    user: "data_mgr",
  },
];

interface AppDataContextType {
  sources: SourceRecord[];
  setSources: React.Dispatch<React.SetStateAction<SourceRecord[]>>;
  stations: StationRecord[];
  setStations: React.Dispatch<React.SetStateAction<StationRecord[]>>;
  uploadHistory: HistoryRecord[];
  setUploadHistory: React.Dispatch<React.SetStateAction<HistoryRecord[]>>;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<SourceRecord[]>(initialSources);
  const [stations, setStations] = useState<StationRecord[]>(initialStations);
  const [uploadHistory, setUploadHistory] =
    useState<HistoryRecord[]>(initialHistory);

  return (
    <AppDataContext.Provider
      value={{
        sources,
        setSources,
        stations,
        setStations,
        uploadHistory,
        setUploadHistory,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
