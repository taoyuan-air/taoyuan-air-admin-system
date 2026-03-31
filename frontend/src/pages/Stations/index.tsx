import { useState } from 'react';
import { List, LayoutGrid, MapPin } from 'lucide-react';
import Card from '../../components/Card';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/StatusBadge';

const mockStations = [
  { id: 'S001', name: '桃園測站', type: '一般測站', district: '桃園區', lat: 24.9936, lon: 121.3010, operator: '環境部',  active: true,  score: 95, calibration: '2025-01-10' },
  { id: 'S002', name: '中壢測站', type: '一般測站', district: '中壢區', lat: 24.9600, lon: 121.2247, operator: '環境部',  active: true,  score: 88, calibration: '2025-01-08' },
  { id: 'S003', name: '觀音測站', type: '工業測站', district: '觀音區', lat: 25.0167, lon: 121.1000, operator: '環境部',  active: true,  score: 72, calibration: '2024-12-20' },
  { id: 'S004', name: '平鎮測站', type: '一般測站', district: '平鎮區', lat: 24.9500, lon: 121.2167, operator: '環境部',  active: true,  score: 91, calibration: '2025-01-05' },
  { id: 'S005', name: '龍潭測站', type: '背景測站', district: '龍潭區', lat: 24.8667, lon: 121.2167, operator: '環境部',  active: false, score: 60, calibration: '2024-11-15' },
  { id: 'S006', name: '大園光達站', type: '光達測站', district: '大園區', lat: 25.0667, lon: 121.1833, operator: '研究團隊', active: true,  score: 85, calibration: '2025-01-12' },
];

const scoreColor = (score: number) => score >= 90 ? '#6abe74' : score >= 75 ? '#888' : '#aaa';

export default function Stations() {
  const [view, setView] = useState<'list' | 'grid'>('list');

  return (
    <div>
      <Header title="測站管理" subtitle="監測測站狀態、設備維護與資料品質管理" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['list', 'grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid rgba(106,190,116,0.4)',
              backgroundColor: view === v ? '#6abe74' : 'transparent',
              color: view === v ? '#fff' : '#6abe74',
              fontSize: 13, cursor: 'pointer',
            }}>
              {v === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
              {v === 'list' ? '列表' : '卡片'}
            </button>
          ))}
        </div>
        <button style={{
          padding: '10px 20px', backgroundColor: '#6abe74',
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ 新增測站</button>
      </div>

      {view === 'list' ? (
        <Card>
          <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                {['測站 ID', '測站名稱', '類型', '行政區', '座標', '管理單位', '品質分數', '最後校正', '狀態', '操作'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockStations.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ padding: '12px', fontSize: 12, color: '#999', fontFamily: 'monospace' }}>{s.id}</td>
                  <td style={{ padding: '12px', fontSize: 13, fontWeight: 600, color: '#374151' }}>{s.name}</td>
                  <td style={{ padding: '12px', fontSize: 12, color: '#666' }}>{s.type}</td>
                  <td style={{ padding: '12px', fontSize: 12, color: '#666' }}>{s.district}</td>
                  <td style={{ padding: '12px', fontSize: 11, color: '#999', fontFamily: 'monospace' }}>{s.lat.toFixed(4)}, {s.lon.toFixed(4)}</td>
                  <td style={{ padding: '12px', fontSize: 12, color: '#666' }}>{s.operator}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(s.score) }}>{s.score}</span>
                  </td>
                  <td style={{ padding: '12px', fontSize: 12, color: '#666' }}>{s.calibration}</td>
                  <td style={{ padding: '12px' }}><StatusBadge status={s.active ? 'active' : 'inactive'} /></td>
                  <td style={{ padding: '12px' }}>
                    <button style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid rgba(106,190,116,0.4)',
                      backgroundColor: 'transparent', color: '#6abe74',
                      fontSize: 11, cursor: 'pointer',
                    }}>編輯</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      ) : (
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {mockStations.map(s => (
            <Card key={s.id} padding={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.id} · {s.type}</div>
                </div>
                <StatusBadge status={s.active ? 'active' : 'inactive'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', marginBottom: 12 }}>
                <MapPin size={12} color="#6abe74" />
                {s.district} · {s.operator}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#666' }}>資料品質</span>
                <div style={{ flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.score}%`, backgroundColor: scoreColor(s.score), borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(s.score) }}>{s.score}</span>
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>最後校正：{s.calibration}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
