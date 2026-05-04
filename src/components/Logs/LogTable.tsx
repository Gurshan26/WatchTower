import type { LogRow as LogRowType } from '@/types/telemetry';
import LogRow from './LogRow';

export default function LogTable({ rows }: { rows: LogRowType[] }) {
  return (
    <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-2)', fontSize: 12 }}>
            <th style={{ padding: '8px 10px' }}>Time</th>
            <th style={{ padding: '8px 10px' }}>Level</th>
            <th style={{ padding: '8px 10px' }}>Message</th>
            <th style={{ padding: '8px 10px' }}>Trace</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LogRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
