import { apiUrl } from '../config/api';
import type { LidarStationsResponse, LidarPlotData, LidarQueryParams } from '../types/lidar';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchLidarStations(token: string): Promise<LidarStationsResponse> {
  const res = await fetch(apiUrl('/api/lidar/stations'), {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`stations request failed: ${res.status}`);
  return res.json();
}

export async function fetchLidarPlotData(
  token: string,
  params: LidarQueryParams,
): Promise<LidarPlotData> {
  // Taiwan 00:00 ~ 23:59:59 → convert to UTC for API
  const [year, month, day] = params.date.split('-').map(Number);
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 8 * 3600 * 1000);
  const endUtc   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59) - 8 * 3600 * 1000);

  const qs = new URLSearchParams({
    station:   params.station,
    start:     startUtc.toISOString(),
    end:       endUtc.toISOString(),
    heightMax: String(params.heightMax),
    panels:    params.panels.join(','),
  });

  const res = await fetch(apiUrl(`/api/lidar/plot-data?${qs}`), {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `plot-data request failed: ${res.status}`);
  }
  return res.json();
}
