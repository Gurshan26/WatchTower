import HealthScore from '@/components/Overview/HealthScore';
import LiveFeed from '@/components/Overview/LiveFeed';
import MetricCard from '@/components/Overview/MetricCard';
import ServiceMap from '@/components/Overview/ServiceMap';
import ExplainerPanel from '@/components/shared/ExplainerPanel';
import styles from './page.module.css';

async function getOverview() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/telemetry/overview`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, number>;
}

export default async function DashboardHomePage() {
  const overview = await getOverview();

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1>Overview</h1>
        <p className={styles.subtitle}>Something broke? You can see it here in seconds.</p>
      </header>

      <section className={styles.topGrid}>
        <HealthScore
          value={overview?.health_score ?? 98}
          traceCount={overview?.trace_count ?? 0}
          errorRate={overview?.error_rate ?? 0}
        />
        <MetricCard title="Traces (1h)" value={overview?.trace_count ?? 0} tone="blue" metric="traces" />
        <MetricCard title="Errors (1h)" value={overview?.error_log_count ?? 0} tone="red" metric="errors" />
        <MetricCard
          title="Avg Duration"
          value={`${(overview?.avg_duration_ms ?? 0).toFixed(1)}ms`}
          tone="amber"
          metric="latency"
        />
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Live Feed</h2>
            <ExplainerPanel
              title="What is this?"
              content="Live feed shows traces, alert events, and error logs as they land. Trigger chaos and watch this update without refreshing."
            />
          </div>
          <LiveFeed />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Service Map</h2>
            <ExplainerPanel
              title="What is this?"
              content="This is a simple topology view of the self-observing stack. Dashboard calls API routes, API routes emit telemetry, telemetry flows back into storage and UI."
            />
          </div>
          <ServiceMap />
        </div>
      </section>
    </div>
  );
}
