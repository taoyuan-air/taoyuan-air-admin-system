import { useState } from 'react';
import { Info } from 'lucide-react';
import WindLidarControls, { type WindPanelKey, ALL_WIND_PANELS, WIND_PANEL_LABELS } from './WindLidarControls';

function todayTaiwanDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
}

export default function WindLidarPage() {
  const [station, setStation]     = useState('');
  const [date, setDate]           = useState(todayTaiwanDate);
  const [heightMax, setHeightMax] = useState(0.5);
  const [panels, setPanels]       = useState<WindPanelKey[]>(ALL_WIND_PANELS);
  const [applied, setApplied]     = useState(false);

  function handleApply() {
    if (!station || !date) return;
    setApplied(true);
  }

  return (
    <div>
      <WindLidarControls
        stations={[]}
        station={station}
        date={date}
        heightMax={heightMax}
        panels={panels}
        loading={false}
        onStationChange={setStation}
        onDateChange={setDate}
        onHeightChange={setHeightMax}
        onPanelsChange={setPanels}
        onApply={handleApply}
      />

      {!applied ? (
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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {panels.map(p => (
            <div
              key={p}
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(106,190,116,0.15)',
                borderRadius: 12,
                overflow: 'hidden',
                padding: '16px 20px',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                {WIND_PANEL_LABELS[p]}
              </div>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: 13,
                border: '1px dashed rgba(106,190,116,0.2)',
                borderRadius: 8,
                minHeight: 160,
              }}>
                功能開發中
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
