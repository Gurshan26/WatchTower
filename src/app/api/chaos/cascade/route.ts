import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import { NextResponse } from 'next/server';
import { emitToLiveFeed } from '@/lib/live-feed';
import { errorCounter, log, tracer } from '@/lib/tracer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SERVICES = ['gateway', 'auth', 'billing', 'inventory', 'notifications'];

export async function POST() {
  const root = tracer.startSpan('chaos.cascade', {
    attributes: {
      'chaos.triggered_by': 'user',
      'chaos.path': SERVICES.join(' -> '),
    },
  });
  const rootCtx = trace.setSpan(context.active(), root);
  const traceId = root.spanContext().traceId;

  const events: Array<{ service: string; status: 'ok' | 'error' }> = [];

  try {
    for (const [i, service] of SERVICES.entries()) {
      const span = tracer.startSpan(
        `svc.${service}`,
        {
          attributes: {
            'service.name': service,
            'cascade.step': i,
          },
        },
        rootCtx
      );

      await new Promise((r) => setTimeout(r, 120 + i * 80));

      if (service === 'billing' || service === 'inventory') {
        const error = new Error(`${service} dependency timeout`);
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        errorCounter.add(1, { 'error.type': 'cascade' });
        events.push({ service, status: 'error' });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
        events.push({ service, status: 'ok' });
      }

      span.end();
    }

    root.setStatus({ code: SpanStatusCode.ERROR, message: 'Cascade triggered partial failure' });
    log('ERROR', 'Chaos cascade completed with partial failures', { 'chaos.trace_id': traceId });

    emitToLiveFeed({ type: 'chaos', scenario: 'cascade', traceId, events });

    return NextResponse.json({
      traceId,
      events,
      message: 'Cascade failure simulated across 5 services. Open trace for dependency breakdown.',
    });
  } finally {
    root.end();
  }
}
