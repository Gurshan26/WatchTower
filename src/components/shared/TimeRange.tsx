'use client';

export default function TimeRange({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'var(--surface-2)',
        color: 'var(--text)',
        border: '1px solid var(--border-2)',
        borderRadius: 4,
        padding: '4px 8px',
      }}
    >
      <option value="15m">15m</option>
      <option value="1h">1h</option>
      <option value="6h">6h</option>
      <option value="24h">24h</option>
      <option value="72h">72h</option>
    </select>
  );
}
