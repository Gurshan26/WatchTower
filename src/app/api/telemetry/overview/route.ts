import { NextResponse } from 'next/server';
import { getDb, queries } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const since = Date.now() - 60 * 60 * 1000;

  const row = queries.getOverviewStats(db).get(since, since, since, since, since, since) as {
    trace_count: number;
    error_trace_count: number;
    avg_duration_ms: number | null;
    error_log_count: number;
    open_error_groups: number;
    active_alerts: number;
  };

  const errorRate = row.trace_count > 0 ? row.error_trace_count / row.trace_count : 0;

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          errorRate * 60 -
          Math.min((row.avg_duration_ms ?? 0) / 50, 25) -
          Math.min(row.open_error_groups * 2, 10) -
          Math.min(row.active_alerts * 4, 12)
      )
    )
  );

  return NextResponse.json({
    ...row,
    avg_duration_ms: row.avg_duration_ms ?? 0,
    error_rate: errorRate,
    health_score: healthScore,
  });
}
