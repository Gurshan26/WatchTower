'use client';

import { useState } from 'react';
import styles from './ChaosConsole.module.css';

const CHAOS_ACTIONS = [
  {
    id: 'error',
    icon: '!!',
    title: 'Trigger Error',
    description: 'Fire a real exception and capture the full trace + error group.',
    severity: 'critical' as const,
    scenarios: [
      { value: 'database_connection', label: 'Database connection refused' },
      { value: 'null_pointer', label: 'Null pointer dereference' },
      { value: 'rate_limit', label: 'Rate limit exceeded' },
      { value: 'validation', label: 'Validation failure' },
      { value: 'out_of_memory', label: 'Out of memory' },
    ],
    endpoint: '/api/chaos/error',
  },
  {
    id: 'slow',
    icon: '~~',
    title: 'Slow Request',
    description: 'Simulate a slow database call chain with configurable depth and delay.',
    severity: 'warning' as const,
    scenarios: null,
    endpoint: '/api/chaos/slow',
    params: [
      { key: 'delayMs', label: 'Total delay (ms)', default: 2000, min: 500, max: 10000 },
      { key: 'depth', label: 'Span depth', default: 3, min: 1, max: 6 },
    ],
  },
  {
    id: 'cascade',
    icon: '>>',
    title: 'Cascade Failure',
    description: 'Simulate a cascading failure across 5 services with partial recovery.',
    severity: 'critical' as const,
    scenarios: null,
    endpoint: '/api/chaos/cascade',
  },
  {
    id: 'http-fail',
    icon: 'xx',
    title: 'External HTTP Failure',
    description: 'Trigger a failed HTTP call to an external service. Shows client span with error.',
    severity: 'warning' as const,
    scenarios: null,
    endpoint: '/api/chaos/http-fail',
  },
];

interface ChaosResult {
  traceId?: string;
  message: string;
  triggered?: number;
  error?: string;
}

export default function ChaosConsole() {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectedScenario, setScenario] = useState<string>('database_connection');
  const [params, setParams] = useState<Record<string, number>>({ delayMs: 2000, depth: 3 });
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChaosResult | null>(null);

  const active = CHAOS_ACTIONS.find((a) => a.id === activeAction);

  async function runChaos() {
    if (!active) return;
    setLoading(true);
    setResult(null);

    try {
      const body: Record<string, unknown> = {};
      if (active.scenarios) body.scenario = selectedScenario;
      if (active.params) Object.assign(body, params);
      if (active.id === 'error') body.count = count;

      const res = await fetch(active.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ChaosResult;
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResult({ message: `Request failed: ${message}`, error: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.console}>
      <div className={styles.warningBanner}>
        <span className={styles.warningIcon}>!</span>
        <span>
          This is the Chaos Console. Everything here is intentional and reversible. Triggered events appear in real-time
          across all dashboard tabs.
        </span>
      </div>

      <div className={styles.actionGrid}>
        {CHAOS_ACTIONS.map((action) => (
          <button
            key={action.id}
            className={`${styles.actionCard} ${activeAction === action.id ? styles.active : ''} ${styles[action.severity]}`}
            onClick={() => setActiveAction(activeAction === action.id ? null : action.id)}
            data-action={action.id}
          >
            <span className={styles.actionIcon}>{action.icon}</span>
            <div className={styles.actionText}>
              <span className={styles.actionTitle}>{action.title}</span>
              <span className={styles.actionDesc}>{action.description}</span>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className={styles.configPanel}>
          <h3 className={styles.configTitle}>
            {active.icon} {active.title}
          </h3>

          {active.scenarios && (
            <div className={styles.field}>
              <label className={styles.label}>Error scenario</label>
              <select className={styles.select} value={selectedScenario} onChange={(e) => setScenario(e.target.value)}>
                {active.scenarios.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {active.id === 'error' && (
            <div className={styles.field}>
              <label className={styles.label}>Number of errors (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className={styles.input}
              />
            </div>
          )}

          {active.params?.map((p) => (
            <div key={p.key} className={styles.field}>
              <label className={styles.label}>
                {p.label} <span className={styles.paramRange}>({p.min}-{p.max})</span>
              </label>
              <input
                type="range"
                min={p.min}
                max={p.max}
                value={params[p.key] ?? p.default}
                onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))}
                className={styles.range}
              />
              <span className={styles.rangeValue}>{params[p.key] ?? p.default}</span>
            </div>
          ))}

          <button className={`${styles.runBtn} ${loading ? styles.running : ''}`} onClick={runChaos} disabled={loading} data-action="run-chaos">
            {loading ? (
              <>
                <span className={styles.spinner} /> Running...
              </>
            ) : (
              `Run ${active.title} ->`
            )}
          </button>

          {result && (
            <div className={`${styles.result} ${result.error ? styles.resultError : styles.resultOk}`}>
              <p className={styles.resultMessage}>{result.message}</p>
              {result.traceId && (
                <a href={`/dashboard/traces/${result.traceId}`} className={styles.traceLink}>
                  {'View trace -> '}
                  {result.traceId.slice(0, 16)}...
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
