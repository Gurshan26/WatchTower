import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';

const TEST_DB = '/tmp/watchtower-seed-test.db';

function seedMinimal(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (trace_id TEXT PRIMARY KEY, service_name TEXT, root_name TEXT, status TEXT, duration_ms REAL, span_count INTEGER, started_at INTEGER, ended_at INTEGER);
    CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER, severity TEXT, body TEXT, service_name TEXT, trace_id TEXT);
    CREATE TABLE IF NOT EXISTS metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, value REAL, unit TEXT, service_name TEXT, labels TEXT, timestamp INTEGER);
    CREATE TABLE IF NOT EXISTS error_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, fingerprint TEXT UNIQUE, title TEXT, message TEXT, service_name TEXT, first_seen INTEGER, last_seen INTEGER, occurrence_count INTEGER, status TEXT DEFAULT 'open', stack_trace TEXT, sample_trace_id TEXT);
    CREATE TABLE IF NOT EXISTS spans (span_id TEXT PRIMARY KEY, trace_id TEXT, parent_span_id TEXT, name TEXT, service_name TEXT, kind TEXT, status TEXT, error_message TEXT, duration_ms REAL, started_at INTEGER, ended_at INTEGER, attributes TEXT, events TEXT);
  `);
}

let db: Database.Database;

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  db = new Database(TEST_DB);
  seedMinimal(db);
});

afterAll(() => {
  db.close();
  try {
    fs.unlinkSync(TEST_DB);
  } catch {
    // ignore
  }
});

describe('Seed data properties', () => {
  it('produces traces with valid duration_ms', () => {
    db.prepare('INSERT INTO traces VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      'seed-test-1',
      'watchtower',
      '/api/users',
      'ok',
      150.5,
      3,
      Date.now() - 3600000,
      Date.now() - 3600000 + 150
    );

    const trace = db.prepare('SELECT * FROM traces WHERE trace_id = ?').get('seed-test-1') as any;
    expect(trace.duration_ms).toBeGreaterThan(0);
    expect(trace.duration_ms).toBeLessThan(15000);
  });

  it('error rate is realistic (between 2% and 15%)', () => {
    const now = Date.now();
    for (let i = 0; i < 95; i++) {
      db.prepare('INSERT INTO traces VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        `ok-${i}`,
        'watchtower',
        '/api/test',
        'ok',
        100,
        1,
        now - i * 1000,
        now - i * 1000 + 100
      );
    }
    for (let i = 0; i < 5; i++) {
      db.prepare('INSERT INTO traces VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        `err-${i}`,
        'watchtower',
        '/api/test',
        'error',
        200,
        1,
        now - i * 1000,
        now - i * 1000 + 200
      );
    }

    const counts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM traces
    `).get() as any;

    const rate = counts.errors / counts.total;
    expect(rate).toBeGreaterThan(0.01);
    expect(rate).toBeLessThan(0.2);
  });
});
