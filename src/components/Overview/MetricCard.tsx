'use client';

interface Props {
  title: string;
  value: string | number;
  tone: 'blue' | 'red' | 'amber' | 'green' | 'teal' | 'purple';
  metric: string;
}

const COLORS: Record<Props['tone'], string> = {
  blue: 'var(--blue)',
  red: 'var(--red)',
  amber: 'var(--amber)',
  green: 'var(--green)',
  teal: 'var(--teal)',
  purple: 'var(--purple)',
};

export default function MetricCard({ title, value, tone, metric }: Props) {
  const spark = Array.from({ length: 20 }, (_, i) => 8 + Math.sin(i / 3) * 6 + Math.random() * 4);
  return (
    <article
      style={{
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
        padding: 12,
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ color: 'var(--text-2)', fontWeight: 500 }}>{title}</h3>
        <code style={{ color: 'var(--text-3)', fontSize: 11 }}>{metric}</code>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{value}</div>
      <svg width="100%" height="30" viewBox="0 0 200 30" preserveAspectRatio="none">
        <polyline
          points={spark.map((v, i) => `${(i / (spark.length - 1)) * 200},${30 - v}`).join(' ')}
          fill="none"
          stroke={COLORS[tone]}
          strokeWidth="2"
        />
      </svg>
    </article>
  );
}
