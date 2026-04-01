import { Upload, Database, Radio, AlertCircle } from 'lucide-react';
import Card from '../../components/Card';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/StatusBadge';
import { useAppData } from '../../contexts/AppDataContext';

export default function Dashboard() {
  const { sources, stations, uploadHistory } = useAppData();

  const today = new Date().toISOString().slice(0, 10);
  const todayUploads = uploadHistory.filter(r => r.time.startsWith(today) && r.status === 'completed').length;
  const activeSources = sources.filter(s => s.active).length;
  const activeStations = stations.filter(s => s.active).length;
  const alerts = sources.filter(s => s.status === 'error').length
               + uploadHistory.filter(r => r.status === 'failed').length;

  const stats = [
    { label: '今日上傳檔案', value: todayUploads, unit: '個', Icon: Upload },
    { label: '活躍資料來源', value: activeSources, unit: '個', Icon: Database },
    { label: '監測測站',     value: activeStations, unit: '座', Icon: Radio },
    { label: '未處理警報',   value: alerts,         unit: '則', Icon: AlertCircle },
  ];

  const recentUploads = uploadHistory.slice(0, 4);

  // Dashboard 資料來源狀態只顯示前 4 筆
  const dashboardSources = sources.slice(0, 4).map(s => ({
    name: s.name,
    type: s.type,
    status: s.status,
    lastSync: s.lastSync,
  }));

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
            {dashboardSources.map(ds => (
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
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'rgba(106,190,116,0.04)',
                borderRadius: 12,
                border: '1px solid rgba(106,190,116,0.1)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{u.type} · {u.size} · {u.time.slice(11, 16)}</div>
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
