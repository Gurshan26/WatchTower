import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { NextResponse } from 'next/server';
import { emitToLiveFeed } from '@/lib/live-feed';
import { errorCounter, log, tracer } from '@/lib/tracer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const root = tracer.startSpan('chaos.http_fail', {
    attributes: {
      'chaos.triggered_by': 'user',
      'http.url': 'https://example.invalid/service',
    },
  });

  const rootCtx = trace.setSpan(context.active(), root);
  const traceId = root.spanContext().traceId;

  const clientSpan = tracer.startSpan(
    'http.client.call',
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': 'GET',
        'http.url': 'https://example.invalid/service',
      },
    },
    rootCtx
  );

  try {
    try {
      await fetch('https://example.invalid/service', { cache: 'no-store' });
      throw new Error('Expected external call to fail but it succeeded');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('External HTTP failure');
      clientSpan.recordException(error);
      clientSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      root.recordException(error);
      root.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      errorCounter.add(1, { 'error.type': 'http_failure' });
      log('ERROR', `Chaos external HTTP failure: ${error.message}`);

      emitToLiveFeed({ type: 'chaos', scenario: 'http-fail', traceId });

      return NextResponse.json({
        traceId,
        message: 'External HTTP failure simulated. Open trace to inspect failed client span.',
      });
    }
  } finally {
    clientSpan.end();
    root.end();
  }
}
