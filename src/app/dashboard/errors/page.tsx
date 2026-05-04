import ErrorGroup from '@/components/Errors/ErrorGroup';
import ErrorTrend from '@/components/Errors/ErrorTrend';

async function getErrors() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/telemetry/errors`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = (await res.json()) as { errors: Array<Record<string, unknown>> };
  return data.errors ?? [];
}

export default async function ErrorsPage() {
  const groups = await getErrors();
  const trend = groups.slice(0, 24).map((g) => Number(g.occurrence_count) || 0);

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <div>
          <h1>Errors</h1>
          <p style={{ color: 'var(--text-2)' }}>Grouped by fingerprint so repeated failures are tracked together.</p>
        </div>
        <ErrorTrend points={trend.length ? trend : [0, 0, 0, 0]} />
      </header>

      <div style={{ display: 'grid', gap: 8 }}>
        {groups.length === 0 && <div style={{ color: 'var(--text-3)' }}>No grouped errors found.</div>}
        {groups.map((group) => (
          <ErrorGroup key={String(group.id)} group={group as never} />
        ))}
      </div>
    </section>
  );
}
