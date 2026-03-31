import { Upload, Database, Radio, AlertCircle } from 'lucide-react';
import Card from '../../components/Card';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/StatusBadge';

const stats = [
  { label: '今日上傳檔案', value: '24', unit: '個', Icon: Upload },
  { label: '活躍資料來源', value: '8',  unit: '個', Icon: Database },
  { label: '監測測站',     value: '12', unit: '座', Icon: Radio },
  { label: '未處理警報',   value: '3',  unit: '則', Icon: AlertCircle },
];

const dataSources = [
  { name: '環境部 EPA',    type: 'EPA',   status: 'success' as const, lastSync: '5 分鐘前' },
  { name: '中央氣象署 CWA', type: 'CWA',  status: 'success' as const, lastSync: '10 分鐘前' },
  { name: '光達系統 LiDAR', type: 'Lidar', status: 'pending' as const, lastSync: '1 小時前' },
  { name: '無人機 UAV',    type: 'UAV',   status: 'error' as const,   lastSync: '連線失敗' },
];

const recentUploads = [
  { name: 'lidar_20250115_001.las',  type: '光達點雲',  size: '245 MB', status: 'completed' as const,  time: '10:32' },
  { name: 'uav_flight_20250115.csv', type: 'UAV 感測器', size: '12 MB',  status: 'processing' as const, time: '10:15' },
  { name: 'wind_field_20250115.nc',  type: '風場資料',  size: '88 MB',  status: 'completed' as const,  time: '09:50' },
  { name: 'boundary_layer.json',     type: '大氣邊界層', size: '5 MB',   status: 'failed' as const,     time: '09:20' },
];


export default function Dashboard() {
  return (
    <div>
      <Header title="系統儀表板" subtitle="桃園市空氣污染監測後台管控系統" />

      {/* Stats */}
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map(({ label, value, unit, Icon }) => (
          <Card key={label} padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: 'rgba(106,190,116,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color="#6abe74" />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#374151' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {label} <span style={{ color: '#999' }}>{unit}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Data Sources */}
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 16 }}>資料來源狀態</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dataSources.map(ds => (
              <div key={ds.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'rgba(106,190,116,0.04)',
                borderRadius: 12,
                border: '1px solid rgba(106,190,116,0.1)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{ds.name}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>最後同步：{ds.lastSync}</div>
                </div>
                <StatusBadge status={ds.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Uploads */}
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 16 }}>最近上傳記錄</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentUploads.map(u => (
              <div key={u.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'rgba(106,190,116,0.04)',
                borderRadius: 12,
                border: '1px solid rgba(106,190,116,0.1)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{u.type} · {u.size} · {u.time}</div>
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
