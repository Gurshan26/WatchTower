'use client';

import { useEffect, useState } from 'react';

export interface MetricPoint {
  bucket: number;
  avg_value: number;
  max_value: number;
  min_value: number;
  count: number;
}

export function useMetrics(metricName: string, windowMs = 3600000) {
  const [data, setData] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function pull() {
      setLoading(true);
      try {
        const res = await fetch(`/api/telemetry/metrics?name=${encodeURIComponent(metricName)}&windowMs=${windowMs}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const json = (await res.json()) as { data: MetricPoint[] };
          setData(json.data ?? []);
        }
      } finally {
        setLoading(false);
      }
    }

    void pull();
    timer = setInterval(pull, 10000);
    return () => clearInterval(timer);
  }, [metricName, windowMs]);

  return { data, loading };
}
