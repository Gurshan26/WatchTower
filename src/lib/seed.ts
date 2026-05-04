import crypto from 'crypto';
import type Database from 'better-sqlite3';

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ENDPOINTS = [
  '/api/users', '/api/auth/login', '/api/traces', '/api/metrics',
  '/api/logs', '/dashboard', '/api/otlp/v1/traces',
];

const OPERATIONS = [
  'http.GET', 'http.POST', 'db.query', 'db.insert', 'cache.get',
  'external.http', 'auth.verify', 'queue.publish',
];

export function seedHistoricalDataIfNeeded(db: Database.Database, hoursBack = 72): boolean {
  const existingCount = db.prepare('SELECT COUNT(*) as c FROM traces').get() as { c: number };
  if (existingCount.c > 100) return false;

  const now = Date.now();
  const startMs = now - hoursBack * 60 * 60 * 1000;

  const insertTrace = db.prepare(`
    INSERT OR IGNORE INTO traces (trace_id, service_name, root_name, status, duration_ms, span_count, started_at, ended_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSpan = db.prepare(`
    INSERT OR IGNORE INTO spans (span_id, trace_id, parent_span_id, name, service_name, kind, status, error_message, duration_ms, started_at, ended_at, attributes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLog = db.prepare(`
    INSERT INTO logs (timestamp, severity, body, service_name, trace_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMetric = db.prepare(`
    INSERT INTO metrics (name, value, unit, service_name, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertError = db.prepare(`
    INSERT OR IGNORE INTO error_groups (fingerprint, title, message, service_name, first_seen, last_seen, occurrence_count, sample_trace_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const SEED_RATE = 2;
  const totalMinutes = hoursBack * 60;

  db.transaction(() => {
    for (let m = 0; m < totalMinutes; m++) {
      const minuteMs = startMs + m * 60000;
      const hour = new Date(minuteMs).getHours();
      const trafficMultiplier = hour >= 9 && hour <= 17 ? 2.5 : hour >= 0 && hour <= 5 ? 0.3 : 1;
      const tracesThisMinute = Math.floor(SEED_RATE * trafficMultiplier * (0.5 + Math.random()));

      for (let t = 0; t < tracesThisMinute; t++) {
        const traceId = crypto.randomBytes(16).toString('hex');
        const rootOp = randomElement(ENDPOINTS);
        const isError = Math.random() < 0.05;
        const isSlow = Math.random() < 0.08;
        const baseMs = isSlow ? randomBetween(800, 3000) : randomBetween(20, 400);
        const startMs2 = minuteMs + Math.random() * 60000;
        const endMs = startMs2 + baseMs;
        const spanCount = Math.floor(randomBetween(1, 8));

        insertTrace.run(
          traceId,
          'watchtower',
          rootOp,
          isError ? 'error' : 'ok',
          baseMs,
          spanCount,
          startMs2,
          endMs
        );

        const rootSpanId = crypto.randomBytes(8).toString('hex');
        insertSpan.run(
          rootSpanId,
          traceId,
          null,
          rootOp,
          'watchtower',
          'SERVER',
          isError ? 'error' : 'ok',
          isError ? 'Internal Server Error' : null,
          baseMs,
          startMs2,
          endMs,
          '{}'
        );

        for (let s = 1; s < spanCount; s++) {
          const spanMs = baseMs / spanCount;
          const spanStart = startMs2 + s * spanMs;
          insertSpan.run(
            crypto.randomBytes(8).toString('hex'),
            traceId,
            rootSpanId,
            randomElement(OPERATIONS),
            'watchtower',
            'INTERNAL',
            'ok',
            null,
            spanMs,
            spanStart,
            spanStart + spanMs,
            '{}'
          );
        }

        if (isError) {
          insertLog.run(endMs, 'ERROR', `Error handling ${rootOp}: Internal Server Error`, 'watchtower', traceId);
          const fp = crypto.createHash('md5').update(`${rootOp}:Internal Server Error`).digest('hex');
          insertError.run(fp, rootOp, 'Internal Server Error', 'watchtower', startMs2, startMs2, 1, traceId);
        }
      }

      insertMetric.run('http.requests.total', tracesThisMinute, '', 'watchtower', minuteMs);
      insertMetric.run('http.request.duration_ms', randomBetween(50, 400), 'ms', 'watchtower', minuteMs);
      insertMetric.run('errors.total', Math.floor(tracesThisMinute * 0.05), '', 'watchtower', minuteMs);
      insertMetric.run('memory.used_mb', randomBetween(200, 500), 'MB', 'watchtower', minuteMs);

      if (Math.random() < 0.1) {
        insertLog.run(minuteMs, 'INFO', 'Request processed successfully', 'watchtower', null);
      }
      if (Math.random() < 0.02) {
        insertLog.run(minuteMs, 'WARN', 'Slow query detected (>500ms)', 'watchtower', null);
      }
    }
  })();

  console.log(`[WatchTower] Seeded ${hoursBack}h of historical data`);
  return true;
}
