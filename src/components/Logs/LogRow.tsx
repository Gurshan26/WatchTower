import type { LogRow as LogRowType } from '@/types/telemetry';

const SEVERITY_COLOR: Record<string, string> = {
  TRACE: 'var(--text-3)',
  DEBUG: 'var(--teal)',
  INFO: 'var(--blue)',
  WARN: 'var(--amber)',
  ERROR: 'var(--red)',
  FATAL: 'var(--red)',
};

export default function LogRow({ row }: { row: LogRowType }) {
  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
        {new Date(row.timestamp).toLocaleTimeString()}
      </td>
      <td style={{ padding: '8px 10px', color: SEVERITY_COLOR[row.severity] ?? 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
        {row.severity}
      </td>
      <td style={{ padding: '8px 10px' }}>{row.body}</td>
      <td style={{ padding: '8px 10px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{row.trace_id?.slice(0, 12) ?? '-'}</td>
    </tr>
  );
}
