import { NextRequest, NextResponse } from 'next/server';
import { getDb, queries } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') ?? 'http.request.duration_ms';
  const bucketMs = Math.max(Number(searchParams.get('bucketMs') ?? 60_000), 1000);
  const windowMs = Math.max(Number(searchParams.get('windowMs') ?? 60 * 60 * 1000), 60_000);
  const to = Number(searchParams.get('to') ?? Date.now());
  const from = Number(searchParams.get('from') ?? to - windowMs);

  const db = getDb();
  const rows = queries.getMetricTimeSeries(db).all(bucketMs, bucketMs, name, from, to);

  return NextResponse.json({ metric: name, bucketMs, from, to, data: rows });
}
