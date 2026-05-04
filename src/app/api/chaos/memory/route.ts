import { NextRequest, NextResponse } from 'next/server';
import { SpanStatusCode } from '@opentelemetry/api';
import { emitToLiveFeed } from '@/lib/live-feed';
import { log, tracer } from '@/lib/tracer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mb = Math.min(Math.max(Number(body.mb ?? 64), 16), 256);
  const holdMs = Math.min(Math.max(Number(body.holdMs ?? 1200), 100), 5000);

  const span = tracer.startSpan('chaos.memory_pressure', {
    attributes: {
      'chaos.memory.mb': mb,
      'chaos.memory.hold_ms': holdMs,
      'chaos.triggered_by': 'user',
    },
  });

  const traceId = span.spanContext().traceId;

  try {
    log('WARN', `Chaos: memory pressure ${mb}MB for ${holdMs}ms`);
    const chunk = 'x'.repeat(1024 * 1024);
    const blocks = Array.from({ length: mb }, () => chunk + Math.random());
    await new Promise((r) => setTimeout(r, holdMs));
    blocks.length = 0;
    span.setStatus({ code: SpanStatusCode.OK });

    emitToLiveFeed({ type: 'chaos', scenario: 'memory', traceId, mb, holdMs });
    return NextResponse.json({
      traceId,
      message: `Created memory pressure (${mb}MB for ${holdMs}ms). Check traces and metrics.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown memory chaos error';
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message });
    return NextResponse.json({ error: message, message }, { status: 500 });
  } finally {
    span.end();
  }
}
