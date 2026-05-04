'use client';

import { useEffect, useState } from 'react';
import type { TraceRow } from '@/types/telemetry';

export function useTraces(windowMs = 3600000) {
  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const to = Date.now();
      const from = to - windowMs;
      const res = await fetch(`/api/telemetry/traces?from=${from}&to=${to}&limit=200`, { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as { traces: TraceRow[] };
        setTraces(json.traces ?? []);
      }
      setLoading(false);
    }

    void load();
  }, [windowMs]);

  return { traces, loading };
}
