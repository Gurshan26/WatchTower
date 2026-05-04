import TraceTable from '@/components/Traces/TraceTable';
import ExplainerPanel from '@/components/shared/ExplainerPanel';

async function getTraces() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const to = Date.now();
  const from = to - 24 * 60 * 60 * 1000;
  const res = await fetch(`${base}/api/telemetry/traces?from=${from}&to=${to}&limit=200`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { traces: Array<Record<string, unknown>> };
  return data.traces ?? [];
}

export default async function TracesPage() {
  const traces = await getTraces();

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Traces</h1>
          <p style={{ color: 'var(--text-2)' }}>The request path, end to end. Width = time spent.</p>
        </div>
        <ExplainerPanel
          content="Each row is one trace. Open a trace to see the waterfall. If a request fails, you will see the error span in red."
        />
      </header>

      <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}>
        <TraceTable traces={traces as never[]} />
      </div>
    </section>
  );
}
