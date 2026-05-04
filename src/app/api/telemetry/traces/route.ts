import { NextRequest, NextResponse } from 'next/server';
import { getDb, queries } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = Number(searchParams.get('to') ?? Date.now());
  const from = Number(searchParams.get('from') ?? to - 60 * 60 * 1000);
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 1000);
  const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);

  const db = getDb();
  const traces = queries.getTraces(db).all(from, to, limit, offset);

  return NextResponse.json({ traces, pagination: { limit, offset } });
}
