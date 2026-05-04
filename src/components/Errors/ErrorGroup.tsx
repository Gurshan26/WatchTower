import Link from 'next/link';
import type { ErrorGroup as ErrorGroupType } from '@/types/telemetry';

export default function ErrorGroup({ group }: { group: ErrorGroupType }) {
  return (
    <article
      style={{
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: 6,
        background: 'rgba(239, 68, 68, 0.07)',
        padding: 10,
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong>{group.title}</strong>
        <code style={{ color: 'var(--red)' }}>{group.occurrence_count}x</code>
      </div>
      <p style={{ color: 'var(--text-2)' }}>{group.message}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', fontSize: 12 }}>
        <span>Last seen {new Date(group.last_seen).toLocaleString()}</span>
        {group.sample_trace_id && (
          <Link href={`/dashboard/traces/${group.sample_trace_id}`} style={{ color: 'var(--blue)' }}>
            {'Open trace ->'}
          </Link>
        )}
      </div>
    </article>
  );
}
