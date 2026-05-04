import TraceWaterfall from '@/components/Traces/TraceWaterfall';
import CopyButton from '@/components/shared/CopyButton';

interface Props {
  params: { traceId: string };
}

async function getTrace(traceId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/telemetry/traces/${traceId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as {
    trace: Record<string, unknown>;
    spans: Array<Record<string, unknown>>;
  };
}

export default async function TraceDetailPage({ params }: Props) {
  const data = await getTrace(params.traceId);

  if (!data) {
    return <div style={{ color: 'var(--red)' }}>Trace not found.</div>;
  }

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <h1>Trace Waterfall</h1>
          <p style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{params.traceId}</p>
        </div>
        <CopyButton text={params.traceId} />
      </header>
      <TraceWaterfall traceId={params.traceId} spans={data.spans as never[]} />
    </section>
  );
}
