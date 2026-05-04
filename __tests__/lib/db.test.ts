import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const TEST_DB = path.join('/tmp', 'watchtower-test.db');

let db: Database.Database;

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  db = new Database(TEST_DB);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      trace_id TEXT PRIMARY KEY, service_name TEXT, root_name TEXT,
      status TEXT, duration_ms REAL, span_count INTEGER, started_at INTEGER, ended_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS spans (
      span_id TEXT PRIMARY KEY, trace_id TEXT, parent_span_id TEXT,
      name TEXT, service_name TEXT, kind TEXT, status TEXT, error_message TEXT,
      duration_ms REAL, started_at INTEGER, ended_at INTEGER, attributes TEXT, events TEXT
    );
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER, severity TEXT,
      body TEXT, service_name TEXT, trace_id TEXT, span_id TEXT, attributes TEXT,
      created_at INTEGER DEFAULT (unixepoch('now', 'subsec') * 1000)
    );
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, value REAL,
      unit TEXT, service_name TEXT, labels TEXT, timestamp INTEGER
    );
    CREATE TABLE IF NOT EXISTS error_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT, fingerprint TEXT UNIQUE, title TEXT,
      message TEXT, service_name TEXT, first_seen INTEGER, last_seen INTEGER,
      occurrence_count INTEGER, status TEXT DEFAULT 'open', stack_trace TEXT, sample_trace_id TEXT
    );
  `);
});

afterAll(() => {
  db.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('Database schema', () => {
  it('creates traces table', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    expect(tables.map((t) => t.name)).toContain('traces');
  });

  it('creates all required tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain('spans');
    expect(names).toContain('logs');
    expect(names).toContain('metrics');
    expect(names).toContain('error_groups');
  });
});

describe('Trace insertion and retrieval', () => {
  const TRACE_ID = 'test-trace-1234567890abcdef';

  it('inserts and retrieves a trace', () => {
    db.prepare(`
      INSERT INTO traces (trace_id, service_name, root_name, status, duration_ms, span_count, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(TRACE_ID, 'test-service', 'GET /api/test', 'ok', 123.4, 3, Date.now() - 1000, Date.now());

    const trace = db.prepare('SELECT * FROM traces WHERE trace_id = ?').get(TRACE_ID) as any;
    expect(trace.trace_id).toBe(TRACE_ID);
    expect(trace.status).toBe('ok');
    expect(trace.duration_ms).toBeCloseTo(123.4);
    expect(trace.span_count).toBe(3);
  });

  it('updates trace status to error via UPDATE', () => {
    db.prepare('UPDATE traces SET status = ? WHERE trace_id = ?').run('error', TRACE_ID);
    const trace = db.prepare('SELECT status FROM traces WHERE trace_id = ?').get(TRACE_ID) as any;
    expect(trace.status).toBe('error');
  });

  it('prevents duplicate trace_id via INSERT OR REPLACE', () => {
    db.prepare(`
      INSERT OR REPLACE INTO traces (trace_id, service_name, root_name, status, duration_ms, span_count, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(TRACE_ID, 'test-service', 'GET /api/test', 'ok', 200.0, 5, Date.now() - 1000, Date.now());

    const count = db.prepare('SELECT COUNT(*) as c FROM traces WHERE trace_id = ?').get(TRACE_ID) as any;
    expect(count.c).toBe(1);
  });
});

describe('Log insertion and filtering', () => {
  it('inserts logs correctly', () => {
    const now = Date.now();
    db.prepare('INSERT INTO logs (timestamp, severity, body, service_name) VALUES (?, ?, ?, ?)').run(
      now,
      'INFO',
      'Test log',
      'test-service'
    );
    db.prepare('INSERT INTO logs (timestamp, severity, body, service_name) VALUES (?, ?, ?, ?)').run(
      now,
      'ERROR',
      'Test error',
      'test-service'
    );

    const all = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC').all() as any[];
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('filters logs by severity', () => {
    const errors = db.prepare('SELECT * FROM logs WHERE severity = ?').all('ERROR') as any[];
    expect(errors.every((l) => l.severity === 'ERROR')).toBe(true);
  });
});

describe('Metrics insertion and time-series query', () => {
  it('inserts metrics and aggregates by time bucket', () => {
    const now = Date.now();
    const BUCKET_MS = 60000;
    for (let i = 1; i <= 5; i++) {
      db.prepare('INSERT INTO metrics (name, value, unit, service_name, labels, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
        'test.metric',
        i * 10,
        'ms',
        'test',
        '{}',
        now + i * 1000
      );
    }

    const rows = db.prepare(`
      SELECT (timestamp / ?) * ? as bucket, AVG(value) as avg_value, COUNT(*) as count
      FROM metrics WHERE name = ?
      GROUP BY bucket ORDER BY bucket
    `).all(BUCKET_MS, BUCKET_MS, 'test.metric') as any[];

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].avg_value).toBeGreaterThan(0);
  });
});

describe('Error group deduplication', () => {
  it('deduplicates errors by fingerprint', () => {
    const fingerprint = 'test-fingerprint-abc123';
    db.prepare(`
      INSERT INTO error_groups (fingerprint, title, message, service_name, first_seen, last_seen, occurrence_count, sample_trace_id)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(fingerprint) DO UPDATE SET last_seen = excluded.last_seen, occurrence_count = occurrence_count + 1
    `).run(fingerprint, 'TestError', 'Something failed', 'test', Date.now(), Date.now(), 'trace-123');

    db.prepare(`
      INSERT INTO error_groups (fingerprint, title, message, service_name, first_seen, last_seen, occurrence_count, sample_trace_id)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(fingerprint) DO UPDATE SET last_seen = excluded.last_seen, occurrence_count = occurrence_count + 1
    `).run(fingerprint, 'TestError', 'Something failed', 'test', Date.now(), Date.now(), 'trace-456');

    const group = db.prepare('SELECT * FROM error_groups WHERE fingerprint = ?').get(fingerprint) as any;
    expect(group.occurrence_count).toBe(2);
  });
});
