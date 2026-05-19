import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlotRelayoutEvent } from 'plotly.js';
import { AlertCircle, Info, FileText } from 'lucide-react';
import LidarControls from './LidarControls';
import LidarPanel from './LidarPanel';
import { fetchLidarStations, fetchLidarPlotData } from '../../services/lidarService';
import { useAuth } from '../../contexts/AuthContext';
import type { LidarPlotData, LidarQueryParams, PanelKey, LidarStation } from '../../types/lidar';

const DEFAULT_PANELS: PanelKey[] = ['nrb', 'depol', 'temperature', 'backgroundEnergy'];

function todayTaiwanDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
}

export default function AerosolLidarPage() {
  const { token } = useAuth();
  const [stations, setStations]   = useState<LidarStation[]>([]);
  const [station, setStation]     = useState('');
  const [date, setDate]           = useState(todayTaiwanDate);
  const [heightMax, setHeightMax] = useState(1);
  const [panels, setPanels]       = useState<PanelKey[]>(DEFAULT_PANELS);

  const [plotData, setPlotData]   = useState<LidarPlotData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [xRange, setXRange]       = useState<[string, string] | null>(null);
  const syncLock = useRef(false);

  useEffect(() => {
    if (!token) return;
    fetchLidarStations(token)
      .then(res => {
        setStations(res.stations);
        if (res.stations.length > 0) {
          setStation(res.stations[0].name);
          const dates = res.stations[0].dates;
          if (dates.length > 0) setDate(dates[dates.length - 1]);
        }
      })
      .catch(err => setError(String(err)));
  }, [token]);

  const loadPlotData = useCallback(async () => {
    if (!token || !station || !date) return;
    setLoading(true);
    setError(null);
    setPlotData(null);
    setXRange(null);
    try {
      const params: LidarQueryParams = { station, date, heightMax, panels };
      const data = await fetchLidarPlotData(token, params);
      setPlotData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [token, station, date, heightMax, panels]);

  useEffect(() => {
    if (station && date) loadPlotData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRelayout(event: Partial<PlotRelayoutEvent>) {
    if (syncLock.current) return;
    const xStart = (event as Record<string, unknown>)['xaxis.range[0]'] as string | undefined;
    const xEnd   = (event as Record<string, unknown>)['xaxis.range[1]'] as string | undefined;
    if (xStart && xEnd) {
      syncLock.current = true;
      setXRange([xStart, xEnd]);
      requestAnimationFrame(() => { syncLock.current = false; });
    }
    const autorange = (event as Record<string, unknown>)['xaxis.autorange'];
    if (autorange) {
      syncLock.current = true;
      setXRange(null);
      requestAnimationFrame(() => { syncLock.current = false; });
    }
  }

  const activePanels = plotData
    ? panels.filter(p => plotData.panels[p] !== undefined)
    : panels;

  return (
    <div>
      <LidarControls
        stations={stations}
        station={station}
        date={date}
        heightMax={heightMax}
        panels={panels}
        loading={loading}
        onStationChange={setStation}
        onDateChange={setDate}
        onHeightChange={setHeightMax}
        onPanelsChange={setPanels}
        onApply={loadPlotData}
      />

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          backgroundColor: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.25)',
          borderRadius: 10,
          marginBottom: 16,
          color: '#dc2626',
          fontSize: 13,
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {panels.map(p => (
            <div key={p} style={{
              height: 220,
              backgroundColor: 'rgba(106,190,116,0.04)',
              border: '1px solid rgba(106,190,116,0.15)',
              borderRadius: 10,
              animation: 'pulse 1.4s ease-in-out infinite',
            }} />
          ))}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.45; }
            }
          `}</style>
        </div>
      )}

      {!loading && !error && !plotData && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10,
          height: 280, color: '#9ca3af', fontSize: 13,
          border: '1px dashed rgba(106,190,116,0.3)',
          borderRadius: 14,
        }}>
          <Info size={32} color="#d1fae5" />
          選擇站點與日期後點選「套用」以載入圖表
        </div>
      )}

      {!loading && plotData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activePanels.map(p => (
            <div
              key={p}
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(106,190,116,0.15)',
                borderRadius: 12,
                overflow: 'hidden',
                padding: '4px 0',
              }}
            >
              <LidarPanel
                panelKey={p}
                data={plotData}
                xRange={xRange}
                onRelayout={handleRelayout}
              />
            </div>
          ))}

          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 16,
            padding: '10px 16px',
            backgroundColor: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(106,190,116,0.15)',
            borderRadius: 10,
            fontSize: 11,
            color: '#6b7280',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FileText size={13} />
              來源檔案：{plotData.sourceFiles.join('、')}
            </span>
            <span>資料筆數：{plotData.times.length} 個時間步</span>
            <span>高度層數：{plotData.rangeKm.length}</span>
            {plotData.times.length > 0 && (
              <span>時間範圍：{plotData.times[0]} — {plotData.times[plotData.times.length - 1]}</span>
            )}
            {plotData.warnings.map((w, i) => (
              <span key={i} style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
