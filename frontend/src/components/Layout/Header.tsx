interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header style={{ marginBottom: 28 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#374151', marginBottom: 2 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, color: '#666' }}>{subtitle}</p>}
    </header>
  );
}
