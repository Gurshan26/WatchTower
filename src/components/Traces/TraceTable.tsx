'use client';

import Link from 'next/link';
import type { TraceRow } from '@/types/telemetry';
import Badge from '@/components/shared/Badge';

export default function TraceTable({ traces }: { traces: TraceRow[] }) {
  const maxDuration = Math.max(...traces.map((t) => t.duration_ms), 1);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: 'var(--text-2)', textAlign: 'left', fontSize: 12 }}>
            <th style={{ padding: '8px 10px' }}>Status</th>
            <th style={{ padding: '8px 10px' }}>Root Span</th>
            <th style={{ padding: '8px 10px' }}>Duration</th>
            <th style={{ padding: '8px 10px' }}>Spans</th>
            <th style={{ padding: '8px 10px' }}>Started</th>
            <th style={{ padding: '8px 10px' }}>Trace ID</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((trace) => {
            const tone = trace.status === 'error' ? 'red' : 'green';
            return (
              <tr key={trace.trace_id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px' }}>
                  <Badge tone={tone}>{trace.status}</Badge>
                </td>
                <td style={{ padding: '10px' }}>{trace.root_name}</td>
                <td style={{ padding: '10px', minWidth: 180 }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <code>{trace.duration_ms.toFixed(1)}ms</code>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max((trace.duration_ms / maxDuration) * 100, 2)}%`,
                          height: '100%',
                          background: trace.status === 'error' ? 'var(--red)' : 'var(--blue)',
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>{trace.span_count}</td>
                <td style={{ padding: '10px', color: 'var(--text-2)' }}>{new Date(trace.started_at).toLocaleString()}</td>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>
                  <Link href={`/dashboard/traces/${trace.trace_id}`} style={{ color: 'var(--blue)' }}>
                    {trace.trace_id.slice(0, 18)}...
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
