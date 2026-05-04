import { context, metrics, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { SeverityNumber } from '@opentelemetry/api-logs';

const SERVICE = 'watchtower';

export const tracer = trace.getTracer(SERVICE, '1.0.0');
export const meter = metrics.getMeter(SERVICE, '1.0.0');
export const logger = logs.getLogger(SERVICE, '1.0.0');

export const httpRequestCounter = meter.createCounter('http.requests.total', {
  description: 'Total HTTP requests',
});

export const httpDurationHistogram = meter.createHistogram('http.request.duration_ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
  advice: { explicitBucketBoundaries: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000] },
});

export const errorCounter = meter.createCounter('errors.total', {
  description: 'Total errors',
});

export const activeSpansGauge = meter.createUpDownCounter('spans.active', {
  description: 'Currently active spans',
});

export async function withSpan<T>(
  name: string,
  fn: (span: ReturnType<typeof tracer.startSpan>) => Promise<T>,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
  }
): Promise<T> {
  const span = tracer.startSpan(name, {
    kind: options?.kind ?? SpanKind.INTERNAL,
    attributes: options?.attributes,
  });

  activeSpansGauge.add(1);
  const startMs = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    errorCounter.add(1, { 'error.type': error.constructor?.name ?? 'Error' });
    throw err;
  } finally {
    const durationMs = Date.now() - startMs;
    httpDurationHistogram.record(durationMs, { 'span.name': name });
    activeSpansGauge.add(-1);
    span.end();
  }
}

export function log(
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  body: string,
  attributes?: Record<string, string | number | boolean>
): void {
  const severityMap = {
    DEBUG: SeverityNumber.DEBUG,
    INFO: SeverityNumber.INFO,
    WARN: SeverityNumber.WARN,
    ERROR: SeverityNumber.ERROR,
  };

  logger.emit({
    severityNumber: severityMap[severity],
    severityText: severity,
    body,
    attributes,
  });
}
