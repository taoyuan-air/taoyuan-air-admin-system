import { Layers, Wind } from 'lucide-react';

export type LidarType = 'aerosol' | 'wind';

interface Props {
  active: LidarType;
  onChange: (type: LidarType) => void;
}

export default function LidarTypeTabs({ active, onChange }: Props) {
  const tabs = [
    { key: 'aerosol' as const, label: '氣膠光達', icon: <Layers size={14} /> },
    { key: 'wind' as const,    label: '風光達',   icon: <Wind size={14} /> },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {tabs.map(tab => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 9,
                border: 'none',
                backgroundColor: isActive ? '#6abe74' : 'transparent',
                color: isActive ? '#fff' : '#666',
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 8px rgba(106,190,116,0.25)' : 'none',
                transition: 'background-color 0.15s, color 0.15s, box-shadow 0.15s',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
