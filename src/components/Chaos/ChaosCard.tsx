interface ChaosCardProps {
  title: string;
  description: string;
  active?: boolean;
  tone?: 'critical' | 'warning';
  onClick?: () => void;
}

export default function ChaosCard({ title, description, active, tone = 'warning', onClick }: ChaosCardProps) {
  const borderColor = tone === 'critical' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${active ? borderColor : 'var(--border)'}`,
        background: active ? 'var(--surface-2)' : 'var(--surface)',
        borderRadius: 6,
        padding: 10,
        cursor: 'pointer',
        display: 'grid',
        gap: 4,
      }}
    >
      <strong>{title}</strong>
      <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{description}</span>
    </button>
  );
}
