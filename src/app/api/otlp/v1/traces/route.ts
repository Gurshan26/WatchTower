import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runAlertEvaluation } from '@/lib/alert-engine';
import { getDb } from '@/lib/db';
import { emitToLiveFeed } from '@/lib/live-feed';
import { nanosToMs, parseAttributes, spanKindToText, statusCodeToText } from '@/lib/otlp-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OTLPSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: Array<{ key: string; value: any }>;
  events?: Array<{ name: string; timeUnixNano: string; attributes?: any[] }>;
  status?: { code: number; message?: string };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const insertSpan = db.prepare(`
      INSERT OR IGNORE INTO spans
        (span_id, trace_id, parent_span_id, name, service_name, kind, status, error_message,
         duration_ms, started_at, ended_at, attributes, events)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const upsertTrace = db.prepare(`
      INSERT INTO traces
        (trace_id, service_name, root_name, status, duration_ms, span_count, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(trace_id) DO UPDATE SET
        status = CASE WHEN excluded.status = 'error' THEN 'error' ELSE traces.status END,
        duration_ms = MAX(traces.duration_ms, excluded.duration_ms),
        span_count = MAX(traces.span_count, excluded.span_count),
        started_at = MIN(traces.started_at, excluded.started_at),
        ended_at = MAX(traces.ended_at, excluded.ended_at),
        root_name = CASE WHEN traces.root_name IS NULL OR traces.root_name = '' THEN excluded.root_name ELSE traces.root_name END
    `);

    const traceState = new Map<
      string,
      {
        serviceName: string;
        rootName: string;
        status: 'ok' | 'error' | 'unset';
        startedAt: number;
        endedAt: number;
        spanCount: number;
      }
    >();

    const processAll = db.transaction(() => {
      const newTraces = new Set<string>();

      for (const resourceSpan of body.resourceSpans ?? []) {
        const serviceName =
          resourceSpan.resource?.attributes?.find((a: any) => a.key === 'service.name')?.value?.stringValue ?? 'unknown';

        for (const scopeSpan of resourceSpan.scopeSpans ?? []) {
          for (const span of scopeSpan.spans as OTLPSpan[]) {
            const startMs = nanosToMs(span.startTimeUnixNano);
            const endMs = nanosToMs(span.endTimeUnixNano);
            const durationMs = Math.max(0, endMs - startMs);
            const status = statusCodeToText(span.status?.code ?? 0);
            const attrs = parseAttributes(span.attributes as any[]);
            const events = span.events ?? [];
            const isRoot = !span.parentSpanId;
            const errorMsg =
              status === 'error' ? (span.status?.message ?? (attrs['exception.message'] as string) ?? null) : null;

            insertSpan.run(
              span.spanId,
              span.traceId,
              span.parentSpanId ?? null,
              span.name,
              serviceName,
              spanKindToText(span.kind),
              status,
              errorMsg,
              durationMs,
              startMs,
              endMs,
              JSON.stringify(attrs),
              JSON.stringify(events)
            );

            const existing = traceState.get(span.traceId);
            if (!existing) {
              traceState.set(span.traceId, {
                serviceName,
                rootName: isRoot ? span.name : span.name,
                status,
                startedAt: startMs,
                endedAt: endMs,
                spanCount: 1,
              });
            } else {
              existing.status = existing.status === 'error' || status === 'error' ? 'error' : existing.status;
              existing.startedAt = Math.min(existing.startedAt, startMs);
              existing.endedAt = Math.max(existing.endedAt, endMs);
              existing.spanCount += 1;
              if (isRoot) existing.rootName = span.name;
            }

            if (status === 'error' && errorMsg) {
              const fingerprint = crypto.createHash('md5').update(`${span.name}:${errorMsg}`).digest('hex');

              db.prepare(`
                INSERT INTO error_groups (fingerprint, title, message, service_name, first_seen, last_seen, occurrence_count, stack_trace, sample_trace_id)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                ON CONFLICT(fingerprint) DO UPDATE SET
                  last_seen = excluded.last_seen,
                  occurrence_count = occurrence_count + 1,
                  sample_trace_id = excluded.sample_trace_id
              `).run(
                fingerprint,
                span.name,
                errorMsg,
                serviceName,
                startMs,
                startMs,
                (attrs['exception.stacktrace'] as string) ?? null,
                span.traceId
              );
            }
          }
        }
      }

      for (const [traceId, state] of traceState.entries()) {
        upsertTrace.run(
          traceId,
          state.serviceName,
          state.rootName,
          state.status,
          Math.max(0, state.endedAt - state.startedAt),
          state.spanCount,
          state.startedAt,
          state.endedAt
        );
        newTraces.add(traceId);
      }

      return [...newTraces];
    });

    const newTraces = processAll();

    setImmediate(() => {
      void runAlertEvaluation(db);
    });

    if (newTraces.length > 0) {
      emitToLiveFeed({ type: 'trace', traceIds: newTraces });
    }

    return NextResponse.json({ accepted: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[OTLP Traces] Ingest error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
