import { NextRequest, NextResponse } from 'next/server';
import { getDb, queries } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = Number(searchParams.get('to') ?? Date.now());
  const from = Number(searchParams.get('from') ?? to - 60 * 60 * 1000);
  const severity = searchParams.get('severity');
  const q = searchParams.get('q');
  const limit = Math.min(Number(searchParams.get('limit') ?? 200), 2000);
  const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);

  const db = getDb();
  const logs = queries
    .getLogs(db)
    .all(from, to, severity ?? null, severity ?? null, q ? `%${q}%` : null, q ? `%${q}%` : null, limit, offset);

  return NextResponse.json({ logs, pagination: { limit, offset } });
}
