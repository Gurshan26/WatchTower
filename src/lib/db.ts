import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { seedHistoricalDataIfNeeded } from './seed';

const IS_VERCEL = process.env.VERCEL === '1';
const DB_PATH = IS_VERCEL
  ? '/tmp/watchtower.db'
  : path.join(process.cwd(), 'data', 'watchtower.db');

if (!IS_VERCEL) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -32000');
  _db.pragma('temp_store = MEMORY');

  initSchema(_db);
  seedHistoricalDataIfNeeded(_db, 72);

  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      trace_id        TEXT PRIMARY KEY,
      service_name    TEXT NOT NULL DEFAULT 'watchtower',
      root_name       TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'ok' CHECK(status IN ('ok','error','unset')),
      duration_ms     REAL NOT NULL,
      span_count      INTEGER NOT NULL DEFAULT 1,
      started_at      INTEGER NOT NULL,
      ended_at        INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_traces_started  ON traces(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_traces_status   ON traces(status);
    CREATE INDEX IF NOT EXISTS idx_traces_service  ON traces(service_name);

    CREATE TABLE IF NOT EXISTS spans (
      span_id         TEXT PRIMARY KEY,
      trace_id        TEXT NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,
      parent_span_id  TEXT,
      name            TEXT NOT NULL,
      service_name    TEXT NOT NULL DEFAULT 'watchtower',
      kind            TEXT DEFAULT 'INTERNAL',
      status          TEXT NOT NULL DEFAULT 'ok' CHECK(status IN ('ok','error','unset')),
      error_message   TEXT,
      duration_ms     REAL NOT NULL,
      started_at      INTEGER NOT NULL,
      ended_at        INTEGER NOT NULL,
      attributes      TEXT DEFAULT '{}',
      events          TEXT DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_spans_trace    ON spans(trace_id);
    CREATE INDEX IF NOT EXISTS idx_spans_started  ON spans(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_spans_name     ON spans(name);

    CREATE TABLE IF NOT EXISTS logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp       INTEGER NOT NULL,
      severity        TEXT NOT NULL DEFAULT 'INFO'
                       CHECK(severity IN ('TRACE','DEBUG','INFO','WARN','ERROR','FATAL')),
      body            TEXT NOT NULL,
      service_name    TEXT NOT NULL DEFAULT 'watchtower',
      trace_id        TEXT,
      span_id         TEXT,
      attributes      TEXT DEFAULT '{}',
      created_at      INTEGER NOT NULL DEFAULT (unixepoch('now', 'subsec') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_severity  ON logs(severity);
    CREATE INDEX IF NOT EXISTS idx_logs_trace     ON logs(trace_id);

    CREATE TABLE IF NOT EXISTS metrics (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      value           REAL NOT NULL,
      unit            TEXT DEFAULT '',
      service_name    TEXT NOT NULL DEFAULT 'watchtower',
      labels          TEXT DEFAULT '{}',
      timestamp       INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_name      ON metrics(name, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp DESC);

    CREATE TABLE IF NOT EXISTS error_groups (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint      TEXT UNIQUE NOT NULL,
      title            TEXT NOT NULL,
      message          TEXT NOT NULL,
      service_name     TEXT NOT NULL DEFAULT 'watchtower',
      first_seen       INTEGER NOT NULL,
      last_seen        INTEGER NOT NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      status           TEXT DEFAULT 'open' CHECK(status IN ('open','resolved','ignored')),
      stack_trace      TEXT,
      sample_trace_id  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_errors_fingerprint ON error_groups(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_errors_last_seen   ON error_groups(last_seen DESC);

    CREATE TABLE IF NOT EXISTS alerts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_name    TEXT NOT NULL,
      severity     TEXT NOT NULL CHECK(severity IN ('info','warning','critical')),
      message      TEXT NOT NULL,
      metric_name  TEXT,
      metric_value REAL,
      threshold    REAL,
      fired_at     INTEGER NOT NULL,
      resolved_at  INTEGER,
      status       TEXT DEFAULT 'firing' CHECK(status IN ('firing','resolved'))
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_fired ON alerts(fired_at DESC);
  `);
}

export const queries = {
  insertTrace: (db: Database.Database) =>
    db.prepare(`
      INSERT OR REPLACE INTO traces (trace_id, service_name, root_name, status, duration_ms, span_count, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),

  getTraces: (db: Database.Database) =>
    db.prepare(`
      SELECT * FROM traces WHERE started_at >= ? AND started_at <= ?
      ORDER BY started_at DESC LIMIT ? OFFSET ?
    `),

  getTraceById: (db: Database.Database) =>
    db.prepare(`
      SELECT t.*, 
        json_group_array(json_object(
          'span_id', s.span_id, 'parent_span_id', s.parent_span_id,
          'name', s.name, 'status', s.status, 'duration_ms', s.duration_ms,
          'started_at', s.started_at, 'ended_at', s.ended_at,
          'kind', s.kind, 'attributes', s.attributes, 'events', s.events,
          'error_message', s.error_message
        )) as spans
      FROM traces t
      LEFT JOIN spans s ON s.trace_id = t.trace_id
      WHERE t.trace_id = ?
      GROUP BY t.trace_id
    `),

  insertLog: (db: Database.Database) =>
    db.prepare(`
      INSERT INTO logs (timestamp, severity, body, service_name, trace_id, span_id, attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),

  getLogs: (db: Database.Database) =>
    db.prepare(`
      SELECT * FROM logs
      WHERE timestamp >= ? AND timestamp <= ?
      AND (? IS NULL OR severity = ?)
      AND (? IS NULL OR body LIKE ?)
      ORDER BY timestamp DESC LIMIT ? OFFSET ?
    `),

  insertMetric: (db: Database.Database) =>
    db.prepare(`
      INSERT INTO metrics (name, value, unit, service_name, labels, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `),

  getMetricTimeSeries: (db: Database.Database) =>
    db.prepare(`
      SELECT 
        (timestamp / ?) * ? as bucket,
        AVG(value) as avg_value,
        MAX(value) as max_value,
        MIN(value) as min_value,
        COUNT(*) as count
      FROM metrics
      WHERE name = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY bucket ORDER BY bucket
    `),

  getOverviewStats: (db: Database.Database) =>
    db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM traces WHERE started_at >= ?) as trace_count,
        (SELECT COUNT(*) FROM traces WHERE started_at >= ? AND status = 'error') as error_trace_count,
        (SELECT AVG(duration_ms) FROM traces WHERE started_at >= ?) as avg_duration_ms,
        (SELECT COUNT(*) FROM logs WHERE timestamp >= ? AND severity IN ('ERROR','FATAL')) as error_log_count,
        (SELECT COUNT(*) FROM error_groups WHERE last_seen >= ? AND status = 'open') as open_error_groups,
        (SELECT COUNT(*) FROM alerts WHERE fired_at >= ? AND status = 'firing') as active_alerts
    `),
};
