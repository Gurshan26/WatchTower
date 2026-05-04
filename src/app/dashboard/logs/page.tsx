'use client';

import { useCallback, useEffect, useState } from 'react';
import LogSearch from '@/components/Logs/LogSearch';
import LogTable from '@/components/Logs/LogTable';
import type { LogRow } from '@/types/telemetry';

interface Query {
  severity: string;
  query: string;
}

export default function LogsPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [filters, setFilters] = useState<Query>({ severity: '', query: '' });

  const pull = useCallback(async () => {
    const to = Date.now();
    const from = to - 24 * 60 * 60 * 1000;
    const qs = new URLSearchParams({ from: String(from), to: String(to), limit: '500' });
    if (filters.severity) qs.set('severity', filters.severity);
    if (filters.query) qs.set('q', filters.query);
    const res = await fetch(`/api/telemetry/logs?${qs.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { logs: LogRow[] };
      setRows(data.logs ?? []);
    }
  }, [filters]);

  useEffect(() => {
    void pull();
  }, [pull]);

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header>
        <h1>Logs</h1>
        <p style={{ color: 'var(--text-2)' }}>Filter by level or search body text. Debounce is 300ms.</p>
      </header>

      <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', padding: 10 }}>
        <LogSearch onChange={setFilters} />
        <LogTable rows={rows} />
      </div>
    </section>
  );
}
