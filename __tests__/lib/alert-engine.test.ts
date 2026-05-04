import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import { runAlertEvaluation } from '../../src/lib/alert-engine';

const TEST_DB = '/tmp/watchtower-alert-test.db';
let db: Database.Database;

function setupDb() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE traces (trace_id TEXT PRIMARY KEY, status TEXT, duration_ms REAL, started_at INTEGER, ended_at INTEGER);
    CREATE TABLE logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER, severity TEXT, body TEXT, service_name TEXT, trace_id TEXT);
    CREATE TABLE alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, rule_name TEXT, severity TEXT, message TEXT, metric_value REAL, threshold REAL, fired_at INTEGER, resolved_at INTEGER, status TEXT DEFAULT 'firing');
  `);
}

beforeEach(() => setupDb());
afterAll(() => {
  try {
    fs.unlinkSync(TEST_DB);
  } catch {
    // ignore
  }
});

function insertTrace(status: 'ok' | 'error', durationMs: number, ageMs = 60000) {
  const now = Date.now();
  db.prepare('INSERT INTO traces VALUES (?, ?, ?, ?, ?)').run(
    Math.random().toString(36),
    status,
    durationMs,
    now - ageMs,
    now - ageMs + durationMs
  );
}

describe('Alert Engine', () => {
  it('does not fire alert when error rate is low', async () => {
    for (let i = 0; i < 100; i++) insertTrace('ok', 200);
    for (let i = 0; i < 3; i++) insertTrace('error', 200);

    await runAlertEvaluation(db);

    const alerts = db.prepare('SELECT * FROM alerts').all();
    expect(alerts.filter((a: any) => a.rule_name === 'High Error Rate')).toHaveLength(0);
  });

  it('fires alert when error rate exceeds 10%', async () => {
    for (let i = 0; i < 90; i++) insertTrace('ok', 200);
    for (let i = 0; i < 15; i++) insertTrace('error', 200);

    await runAlertEvaluation(db);

    const alerts = db.prepare("SELECT * FROM alerts WHERE rule_name = 'High Error Rate'").all();
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('fires alert when P95 latency exceeds 1000ms', async () => {
    for (let i = 0; i < 95; i++) insertTrace('ok', 100);
    for (let i = 0; i < 15; i++) insertTrace('ok', 2000);

    await runAlertEvaluation(db);

    const alerts = db.prepare("SELECT * FROM alerts WHERE rule_name = 'Slow P95 Latency'").all();
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('does not fire alert when fewer than 10 traces exist', async () => {
    for (let i = 0; i < 5; i++) insertTrace('ok', 2000);

    await runAlertEvaluation(db);

    const alerts = db.prepare("SELECT * FROM alerts WHERE rule_name = 'Slow P95 Latency'").all();
    expect(alerts).toHaveLength(0);
  });

  it('respects cooldown period and does not double-fire', async () => {
    for (let i = 0; i < 90; i++) insertTrace('ok', 200);
    for (let i = 0; i < 15; i++) insertTrace('error', 200);

    await runAlertEvaluation(db);
    const before = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE rule_name = 'High Error Rate'").get() as any;

    await runAlertEvaluation(db);
    const after = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE rule_name = 'High Error Rate'").get() as any;

    expect(after.c).toBe(before.c);
  });
});
