import type Database from 'better-sqlite3';
import { emitToLiveFeed } from './live-feed';

interface AlertRule {
  name: string;
  severity: 'info' | 'warning' | 'critical';
  check: (db: Database.Database, windowMs: number) => { triggered: boolean; value?: number; message: string };
  threshold: number;
  windowMs: number;
  cooldownMs: number;
}

const ALERT_RULES: AlertRule[] = [
  {
    name: 'High Error Rate',
    severity: 'critical',
    threshold: 0.1,
    windowMs: 300_000,
    cooldownMs: 600_000,
    check: (db, windowMs) => {
      const since = Date.now() - windowMs;
      const r = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
        FROM traces WHERE started_at >= ?
      `).get(since) as { total: number; errors: number | null };
      const errors = r.errors ?? 0;
      const rate = r.total > 0 ? errors / r.total : 0;
      return {
        triggered: rate > 0.1,
        value: rate,
        message: `Error rate is ${(rate * 100).toFixed(1)}% in the last 5 minutes (${errors}/${r.total} traces)`,
      };
    },
  },
  {
    name: 'Slow P95 Latency',
    severity: 'warning',
    threshold: 1000,
    windowMs: 300_000,
    cooldownMs: 300_000,
    check: (db, windowMs) => {
      const since = Date.now() - windowMs;
      const rows = db
        .prepare('SELECT duration_ms FROM traces WHERE started_at >= ? ORDER BY duration_ms')
        .all(since) as Array<{ duration_ms: number }>;
      if (rows.length < 10) return { triggered: false, message: 'Insufficient data' };
      const p95idx = Math.floor(rows.length * 0.95);
      const p95 = rows[p95idx]?.duration_ms ?? 0;
      return {
        triggered: p95 > 1000,
        value: p95,
        message: `P95 latency is ${p95.toFixed(0)}ms in the last 5 minutes`,
      };
    },
  },
  {
    name: 'Error Log Spike',
    severity: 'warning',
    threshold: 50,
    windowMs: 60_000,
    cooldownMs: 120_000,
    check: (db, windowMs) => {
      const since = Date.now() - windowMs;
      const r = db
        .prepare(`
          SELECT COUNT(*) as count FROM logs
          WHERE timestamp >= ? AND severity IN ('ERROR','FATAL')
        `)
        .get(since) as { count: number };
      return {
        triggered: r.count > 50,
        value: r.count,
        message: `${r.count} error logs in the last minute`,
      };
    },
  },
];

export async function runAlertEvaluation(db: Database.Database): Promise<void> {
  const insertAlert = db.prepare(`
    INSERT INTO alerts (rule_name, severity, message, metric_value, threshold, fired_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const rule of ALERT_RULES) {
    try {
      const lastFired = db
        .prepare(`
          SELECT fired_at FROM alerts
          WHERE rule_name = ? AND fired_at >= ?
          ORDER BY fired_at DESC LIMIT 1
        `)
        .get(rule.name, Date.now() - rule.cooldownMs) as { fired_at: number } | undefined;

      if (lastFired) continue;

      const result = rule.check(db, rule.windowMs);
      if (result.triggered) {
        insertAlert.run(rule.name, rule.severity, result.message, result.value ?? null, rule.threshold, Date.now());
        emitToLiveFeed({
          type: 'alert',
          rule: rule.name,
          severity: rule.severity,
          message: result.message,
        });
      }
    } catch (err) {
      console.error(`[AlertEngine] Rule '${rule.name}' failed:`, err);
    }
  }
}
