import { useState } from 'react';
import { RefreshCw, Clock, Plug, Settings, ScrollText } from 'lucide-react';
import Card from '../../components/Card';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/StatusBadge';
import { useAppData } from '../../contexts/AppDataContext';

export default function DataSources() {
  const { sources } = useAppData();
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = (id: string) => {
    setTestingId(id);
    setTimeout(() => setTestingId(null), 2000);
  };

  return (
    <div>
      <Header title="資料來源管理" subtitle="管理各資料來源的 API 設定與同步排程" />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={{
          padding: '10px 20px', backgroundColor: '#6abe74',
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ 新增資料來源</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sources.map(src => (
          <Card key={src.id} padding={20}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: 'rgba(106,190,116,0.1)',
                  border: '1px solid rgba(106,190,116,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#6abe74',
                }}>{src.type}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{src.name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.endpoint}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={src.status} />
                <StatusBadge status={src.active ? 'active' : 'inactive'} />
              </div>
            </div>

            <div style={{
              display: 'flex', gap: 24, marginTop: 16,
              padding: '12px 0',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              fontSize: 12, color: '#666',
              flexWrap: 'wrap',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} color="#6abe74" />
                同步頻率：<strong style={{ color: '#374151' }}>{src.frequency > 0 ? `每 ${src.frequency} 分鐘` : '手動'}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color="#6abe74" />
                最後同步：<strong style={{ color: '#374151' }}>{src.lastSync}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => handleTest(src.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid rgba(106,190,116,0.4)',
                backgroundColor: 'transparent', color: '#6abe74',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                <Plug size={12} />
                {testingId === src.id ? '測試中...' : '測試連線'}
              </button>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.1)',
                backgroundColor: 'transparent', color: '#666',
                fontSize: 12, cursor: 'pointer',
              }}>
                <Settings size={12} />
                編輯設定
              </button>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.1)',
                backgroundColor: 'transparent', color: '#666',
                fontSize: 12, cursor: 'pointer',
              }}>
                <ScrollText size={12} />
                同步日誌
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
