export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { Resource } = await import('@opentelemetry/resources');
  const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = await import('@opentelemetry/semantic-conventions');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');
  const { OTLPLogExporter } = await import('@opentelemetry/exporter-logs-otlp-http');
  const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');
  const { BatchLogRecordProcessor } = await import('@opentelemetry/sdk-logs');
  const { HttpInstrumentation } = await import('@opentelemetry/instrumentation-http');
  const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-base');

  const OTLP_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'watchtower',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${OTLP_BASE}/api/otlp/v1/traces`,
    headers: { 'Content-Type': 'application/json' },
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${OTLP_BASE}/api/otlp/v1/metrics`,
    headers: { 'Content-Type': 'application/json' },
  });

  const logExporter = new OTLPLogExporter({
    url: `${OTLP_BASE}/api/otlp/v1/logs`,
    headers: { 'Content-Type': 'application/json' },
  });

  const sdk = new NodeSDK({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 512,
        scheduledDelayMillis: 1000,
        exportTimeoutMillis: 5000,
        maxExportBatchSize: 128,
      }) as any,
    ],
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15000,
    }) as any,
    logRecordProcessor: new BatchLogRecordProcessor(logExporter) as any,
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => req.url?.startsWith('/api/otlp') ?? false,
      }),
    ],
  });

  sdk.start();
  console.log('[WatchTower] OpenTelemetry SDK started');

  process.on('SIGTERM', () => {
    void sdk.shutdown();
  });
}
