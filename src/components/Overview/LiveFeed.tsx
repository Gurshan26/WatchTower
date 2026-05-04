'use client';

import { useMemo } from 'react';
import { useLiveFeed } from '@/hooks/useLiveFeed';
import Badge from '@/components/shared/Badge';

function messageFor(event: Record<string, unknown>): string {
  switch (event.type) {
    case 'trace':
      return `${((event.traceIds as string[] | undefined)?.length ?? 0)} new trace(s) ingested`;
    case 'error_log':
      return `${event.count} error log(s) captured`;
    case 'alert':
      return String(event.message ?? 'Alert fired');
    case 'snapshot':
      return `Snapshot: ${event.traces} traces, ${event.errors} errors, ${event.active_alerts} active alerts`;
    default:
      return 'Event received';
  }
}

function toneFor(type: unknown): 'blue' | 'red' | 'amber' | 'green' | 'purple' {
  if (type === 'error_log') return 'red';
  if (type === 'alert') return 'amber';
  if (type === 'snapshot') return 'green';
  return 'blue';
}

export default function LiveFeed() {
  const { events, connected, paused, setPaused } = useLiveFeed();

  const rows = useMemo(() => events.slice(0, 30), [events]);

  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge tone={connected ? 'green' : 'red'}>{connected ? 'connected' : 'disconnected'}</Badge>
          <span style={{ color: 'var(--text-2)', fontSize: 12 }}>SSE stream</span>
        </div>
        <button
          onClick={() => setPaused((v) => !v)}
          style={{
            border: '1px solid var(--border-2)',
            background: 'var(--surface-2)',
            color: 'var(--text-2)',
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 6, maxHeight: 320, overflow: 'auto' }}>
        {rows.length === 0 && <div style={{ color: 'var(--text-3)' }}>No live events yet.</div>}
        {rows.map((event, idx) => (
          <article
            key={`${event.timestamp}-${idx}`}
            className={event.type === 'error_log' ? 'error-pulse' : undefined}
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              borderRadius: 6,
              padding: '8px 10px',
              display: 'grid',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge tone={toneFor(event.type)}>{String(event.type)}</Badge>
              <code style={{ color: 'var(--text-3)', fontSize: 11 }}>{new Date(event.timestamp).toLocaleTimeString()}</code>
            </div>
            <div style={{ color: 'var(--text-2)' }}>{messageFor(event)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
