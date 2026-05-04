import { NextRequest, NextResponse } from 'next/server';
import { SpanStatusCode } from '@opentelemetry/api';
import { emitToLiveFeed } from '@/lib/live-feed';
import { errorCounter, log, tracer } from '@/lib/tracer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ERROR_SCENARIOS = {
  database_connection: () => {
    throw new Error('ECONNREFUSED: Connection to database at localhost:5432 refused');
  },
  null_pointer: () => {
    const obj: any = null;
    return obj.property.nested;
  },
  timeout: async () => {
    await new Promise((r) => setTimeout(r, 5000));
    throw new Error('Operation timeout: exceeded 5000ms limit');
  },
  rate_limit: () => {
    throw new Error('RateLimitError: Too many requests (429)');
  },
  validation: () => {
    throw new Error('ValidationError: Field "userId" is required but was undefined');
  },
  out_of_memory: () => {
    const arr = new Array(1_000_000).fill('memory pressure test');
    if (!arr.length) {
      throw new Error('unreachable');
    }
    throw new Error('JavaScript heap out of memory');
  },
} as const;

type ErrorScenario = keyof typeof ERROR_SCENARIOS;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenario = (body.scenario ?? 'database_connection') as ErrorScenario;
    const count = Math.min(Math.max(Number(body.count ?? 1), 1), 10);

    if (!ERROR_SCENARIOS[scenario]) {
      return NextResponse.json({ error: `Unknown scenario: ${scenario}` }, { status: 400 });
    }

    const results: Array<{ traceId: string; error: string }> = [];

    for (let i = 0; i < count; i++) {
      const span = tracer.startSpan(`chaos.${scenario}`, {
        attributes: {
          'chaos.scenario': scenario,
          'chaos.iteration': i,
          'chaos.triggered_by': 'user',
        },
      });

      try {
        log('WARN', `Chaos: triggering ${scenario} (${i + 1}/${count})`);
        await ERROR_SCENARIOS[scenario]();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown chaos error');
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        errorCounter.add(1, { 'error.type': scenario });
        log('ERROR', `Chaos error: ${error.message}`, { 'chaos.scenario': scenario });
        results.push({ traceId: span.spanContext().traceId, error: error.message });
      } finally {
        span.end();
      }

      if (i < count - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    emitToLiveFeed({ type: 'chaos', scenario, count: results.length });

    return NextResponse.json({
      triggered: results.length,
      scenario,
      traceId: results[0]?.traceId,
      results,
      message: `Triggered ${results.length} ${scenario} error(s). Check Traces and Errors tabs.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
