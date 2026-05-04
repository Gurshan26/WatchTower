import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT * FROM error_groups
      ORDER BY last_seen DESC
      LIMIT 200
    `)
    .all();

  return NextResponse.json({ errors: rows });
}
