import type { ErrorGroup } from '@/types/telemetry';

export default function ErrorDetail({ group }: { group: ErrorGroup }) {
  return (
    <section style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', padding: 10, display: 'grid', gap: 8 }}>
      <h3>{group.title}</h3>
      <p style={{ color: 'var(--text-2)' }}>{group.message}</p>
      <pre
        style={{
          maxHeight: 220,
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 10,
          background: '#0c1224',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-2)',
        }}
      >
        {group.stack_trace || 'No stack trace captured for this group.'}
      </pre>
    </section>
  );
}
