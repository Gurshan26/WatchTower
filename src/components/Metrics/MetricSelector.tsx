'use client';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const METRICS = ['http.requests.total', 'http.request.duration_ms', 'errors.total', 'memory.used_mb'];

export default function MetricSelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 4, padding: '6px 8px' }}
    >
      {METRICS.map((metric) => (
        <option key={metric} value={metric}>
          {metric}
        </option>
      ))}
    </select>
  );
}
