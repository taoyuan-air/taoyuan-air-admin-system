import { X, Pencil, CheckCircle2 } from 'lucide-react';
import { fmtDt, calcDuration, getTypeLabel, SOURCE_COLORS } from './incidentTypes';
import type { SftpIncident } from './incidentTypes';

interface Props {
  incident: SftpIncident | null;
  onClose: () => void;
  onEdit: (inc: SftpIncident) => void;
  onResolve: (id: number) => void;
}

const rowStyle = {
  display: 'grid' as const,
  gridTemplateColumns: '120px 1fr',
  gap: 8,
  padding: '10px 0',
  borderBottom: '1px solid rgba(0,0,0,0.05)',
  fontSize: 13,
  alignItems: 'start' as const,
};
const keyStyle = { color: '#999', fontWeight: 600 as const, fontSize: 12, paddingTop: 1 };
const valStyle = { color: '#374151', lineHeight: 1.5 };

export default function IncidentDetailModal({ incident, onClose, onEdit, onResolve }: Props) {
  if (!incident) return null;

  const srcColor = SOURCE_COLORS[incident.source];
  const ongoing  = incident.ended_at === null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#F4F2E9', borderRadius: 20, padding: 28,
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>異常事件詳情</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                color: srcColor.color, backgroundColor: srcColor.bg,
              }}>{incident.source}</span>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                color: ongoing ? '#f0a500' : '#6abe74',
                backgroundColor: ongoing ? 'rgba(240,165,0,0.12)' : 'rgba(106,190,116,0.12)',
              }}>{ongoing ? '異常中' : '已復原'}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
            <X size={18} color="#999" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={rowStyle}>
            <span style={keyStyle}>異常類型</span>
            <span style={valStyle}>{getTypeLabel(incident.incident_type)}</span>
          </div>
          <div style={rowStyle}>
            <span style={keyStyle}>異常開始</span>
            <span style={valStyle}>{fmtDt(incident.started_at)}</span>
          </div>
          <div style={rowStyle}>
            <span style={keyStyle}>異常結束</span>
            <span style={{ ...valStyle, color: ongoing ? '#f0a500' : '#374151' }}>
              {ongoing ? '尚未恢復' : fmtDt(incident.ended_at)}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={keyStyle}>持續時間</span>
            <span style={valStyle}>{calcDuration(incident.started_at, incident.ended_at)}</span>
          </div>
          {incident.affected_range && (
            <div style={rowStyle}>
              <span style={keyStyle}>影響資料範圍</span>
              <span style={{ ...valStyle, whiteSpace: 'pre-wrap' as const }}>{incident.affected_range}</span>
            </div>
          )}
          {incident.note && (
            <div style={rowStyle}>
              <span style={keyStyle}>備註</span>
              <span style={{ ...valStyle, whiteSpace: 'pre-wrap' as const, color: '#555' }}>{incident.note}</span>
            </div>
          )}
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={keyStyle}>記錄者 / 時間</span>
            <span style={{ ...valStyle, color: '#666', fontSize: 12 }}>
              {incident.reporter_name} · {fmtDt(incident.created_at)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 20, paddingTop: 16,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
            backgroundColor: 'transparent', color: '#666',
            fontSize: 13, cursor: 'pointer',
          }}>關閉</button>

          <div style={{ display: 'flex', gap: 10 }}>
            {ongoing && (
              <button
                onClick={() => { onResolve(incident.id); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 10,
                  border: '1px solid rgba(106,190,116,0.4)',
                  backgroundColor: 'rgba(106,190,116,0.08)', color: '#4a9e55',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={14} />
                標記已恢復
              </button>
            )}
            <button
              onClick={() => { onEdit(incident); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10,
                border: 'none', backgroundColor: '#6abe74',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Pencil size={14} />
              編輯
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
