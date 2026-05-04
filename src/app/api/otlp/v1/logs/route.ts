import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { emitToLiveFeed } from '@/lib/live-feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEVERITY_MAP: Record<number, string> = {
  1: 'TRACE',
  2: 'TRACE',
  3: 'TRACE',
  4: 'TRACE',
  5: 'DEBUG',
  6: 'DEBUG',
  7: 'DEBUG',
  8: 'DEBUG',
  9: 'INFO',
  10: 'INFO',
  11: 'INFO',
  12: 'INFO',
  13: 'WARN',
  14: 'WARN',
  15: 'WARN',
  16: 'WARN',
  17: 'ERROR',
  18: 'ERROR',
  19: 'ERROR',
  20: 'ERROR',
  21: 'FATAL',
  22: 'FATAL',
  23: 'FATAL',
  24: 'FATAL',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const insertLog = db.prepare(`
      INSERT INTO logs (timestamp, severity, body, service_name, trace_id, span_id, attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let errorCount = 0;

    const insertAll = db.transaction(() => {
      for (const resourceLog of body.resourceLogs ?? []) {
        const serviceName =
          resourceLog.resource?.attributes?.find((a: any) => a.key === 'service.name')?.value?.stringValue ?? 'unknown';

        for (const scopeLog of resourceLog.scopeLogs ?? []) {
          for (const record of scopeLog.logRecords ?? []) {
            const timestamp = parseInt(record.timeUnixNano, 10) / 1_000_000;
            const severity = record.severityText ?? SEVERITY_MAP[record.severityNumber] ?? 'INFO';
            const bodyText = record.body?.stringValue ?? JSON.stringify(record.body) ?? '';

            const attrs: Record<string, unknown> = {};
            for (const attr of record.attributes ?? []) {
              attrs[attr.key] =
                attr.value?.stringValue ?? attr.value?.intValue ?? attr.value?.doubleValue ?? attr.value?.boolValue ?? null;
            }

            insertLog.run(
              timestamp,
              severity,
              bodyText,
              serviceName,
              record.traceId ?? null,
              record.spanId ?? null,
              JSON.stringify(attrs)
            );

            if (severity === 'ERROR' || severity === 'FATAL') {
              errorCount += 1;
            }
          }
        }
      }
    });

    insertAll();

    if (errorCount > 0) {
      emitToLiveFeed({ type: 'error_log', count: errorCount });
    }

    return NextResponse.json({ accepted: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
