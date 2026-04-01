import { Clock } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const now = new Date().toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <header style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 28,
      flexWrap: 'wrap',
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#374151', marginBottom: 2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: '#666' }}>{subtitle}</p>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: '8px 16px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        fontSize: 12,
        color: '#666',
      }}>
        <Clock size={13} color="#6abe74" />
        <span>{now}</span>
      </div>
    </header>
  );
}
