import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { NextRequest, NextResponse } from 'next/server';
import { emitToLiveFeed } from '@/lib/live-feed';
import { httpDurationHistogram, log, tracer } from '@/lib/tracer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const delayMs = Math.min(Number(body.delayMs ?? 2000), 10000);
  const depth = Math.min(Number(body.depth ?? 3), 6);

  async function simulateSlowOperation(
    name: string,
    remaining: number,
    parentMs: number,
    parentCtx: ReturnType<typeof context.active>
  ): Promise<void> {
    const span = tracer.startSpan(
      name,
      {
        kind: name.includes('db') ? SpanKind.CLIENT : SpanKind.INTERNAL,
        attributes: {
          ...(name.includes('db')
            ? {
                'db.system': 'postgresql',
                'db.statement': 'SELECT * FROM orders WHERE user_id = $1',
              }
            : {}),
          'chaos.simulated_delay_ms': Math.floor(parentMs / Math.max(depth, 1)),
        },
      },
      parentCtx
    );

    const spanDelay = Math.floor(parentMs / Math.max(depth, 1));
    await new Promise((r) => setTimeout(r, spanDelay));

    if (remaining > 0) {
      const nextCtx = trace.setSpan(parentCtx, span);
      await simulateSlowOperation(`db.query.nested_${depth - remaining}`, remaining - 1, parentMs - spanDelay, nextCtx);
    }

    httpDurationHistogram.record(spanDelay, { 'span.name': name });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }

  log('WARN', `Chaos: simulating slow query chain (${delayMs}ms across ${depth} spans)`);

  const rootSpan = tracer.startSpan('chaos.slow_request', {
    kind: SpanKind.SERVER,
    attributes: {
      'chaos.total_delay_ms': delayMs,
      'chaos.depth': depth,
      'chaos.triggered_by': 'user',
    },
  });

  const traceId = rootSpan.spanContext().traceId;
  const rootCtx = trace.setSpan(context.active(), rootSpan);

  await simulateSlowOperation('db.query.primary', depth - 1, delayMs, rootCtx);

  rootSpan.setStatus({ code: SpanStatusCode.OK });
  rootSpan.end();

  emitToLiveFeed({ type: 'chaos', scenario: 'slow', traceId });

  return NextResponse.json({
    traceId,
    delayMs,
    depth,
    message: `Slow trace created: ${delayMs}ms across ${depth} nested spans. Find it in Traces.`,
  });
}
