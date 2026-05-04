'use client';

import { useMemo, useState } from 'react';
import MetricChart from '@/components/Metrics/MetricChart';
import MetricSelector from '@/components/Metrics/MetricSelector';
import Heatmap from '@/components/Metrics/Heatmap';
import { useMetrics } from '@/hooks/useMetrics';

export default function MetricsPage() {
  const [metric, setMetric] = useState('http.request.duration_ms');
  const { data, loading } = useMetrics(metric, 6 * 60 * 60 * 1000);

  const color = useMemo(() => {
    if (metric.includes('error')) return '#ef4444';
    if (metric.includes('duration')) return '#f59e0b';
    if (metric.includes('memory')) return '#8b5cf6';
    return '#06b6d4';
  }, [metric]);

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Metrics</h1>
          <p style={{ color: 'var(--text-2)' }}>60-second rolling windows from stored metric points.</p>
        </div>
        <MetricSelector value={metric} onChange={setMetric} />
      </header>

      <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', padding: 12 }}>
        {loading ? <div style={{ color: 'var(--text-2)' }}>Loading metric data...</div> : <MetricChart data={data} color={color} />}
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', padding: 12, display: 'grid', gap: 8 }}>
        <h2>Latency Heatmap</h2>
        <Heatmap data={data} />
      </div>
    </section>
  );
}
