import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params {
  params: { traceId: string };
}

export async function GET(_: Request, { params }: Params) {
  const db = getDb();

  const trace = db.prepare('SELECT * FROM traces WHERE trace_id = ?').get(params.traceId) as Record<string, unknown> | undefined;
  if (!trace) {
    return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
  }

  const spans = db
    .prepare('SELECT * FROM spans WHERE trace_id = ? ORDER BY started_at ASC')
    .all(params.traceId)
    .map((span) => {
      const s = span as Record<string, unknown>;
      return {
        ...s,
        attributes: safeParseObject(String(s.attributes ?? '{}')),
        events: safeParseArray(String(s.events ?? '[]')),
      };
    });

  return NextResponse.json({ trace, spans });
}

function safeParseObject(input: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function safeParseArray(input: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
