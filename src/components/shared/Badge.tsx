import type { PropsWithChildren } from 'react';

export default function Badge({ children, tone = 'blue' }: PropsWithChildren<{ tone?: 'blue' | 'red' | 'amber' | 'green' | 'purple' }>) {
  const styles: Record<string, React.CSSProperties> = {
    blue: { color: 'var(--blue)', background: 'var(--blue-bg)' },
    red: { color: 'var(--red)', background: 'var(--red-bg)' },
    amber: { color: 'var(--amber)', background: 'var(--amber-bg)' },
    green: { color: 'var(--green)', background: 'var(--green-bg)' },
    purple: { color: 'var(--purple)', background: 'var(--purple-bg)' },
  };

  return (
    <span
      style={{
        ...styles[tone],
        borderRadius: 999,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {children}
    </span>
  );
}
