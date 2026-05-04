interface Props {
  value: number;
  traceCount: number;
  errorRate: number;
}

export default function HealthScore({ value, traceCount, errorRate }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const circumference = 2 * Math.PI * 48;
  const stroke = ((100 - clamped) / 100) * circumference;

  return (
    <section
      style={{
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
        padding: 12,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`Health score ${clamped}`}>
        <circle cx="60" cy="60" r="48" stroke="#1e293b" strokeWidth="8" fill="none" />
        <circle
          cx="60"
          cy="60"
          r="48"
          stroke="#10b981"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={stroke}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div style={{ marginTop: -76, fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{clamped}</div>
      <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 4 }}>health score</div>
      <div style={{ display: 'flex', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 10, color: 'var(--text-2)' }}>
        <span>{traceCount} traces</span>
        <span>{(errorRate * 100).toFixed(1)}% error rate</span>
      </div>
    </section>
  );
}
