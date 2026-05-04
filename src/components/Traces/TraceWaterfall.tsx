'use client';
import { useMemo, useRef, useState } from 'react';
import styles from './TraceWaterfall.module.css';

interface Span {
  span_id: string;
  parent_span_id: string | null;
  name: string;
  status: 'ok' | 'error' | 'unset';
  duration_ms: number;
  started_at: number;
  ended_at: number;
  kind: string;
  attributes: Record<string, unknown>;
  events: Array<{ name: string; timeUnixNano: string }>;
  error_message?: string;
}

interface TraceWaterfallProps {
  spans: Span[];
  traceId: string;
}

const SPAN_COLOURS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#F97316', '#14B8A6'];

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 280;
const MIN_BAR_WIDTH = 4;

function buildSpanTree(spans: Span[]): Map<string | null, Span[]> {
  const tree = new Map<string | null, Span[]>();
  for (const span of spans) {
    const key = span.parent_span_id ?? null;
    if (!tree.has(key)) tree.set(key, []);
    tree.get(key)?.push(span);
  }
  for (const children of tree.values()) {
    children.sort((a, b) => a.started_at - b.started_at);
  }
  return tree;
}

function flattenTree(
  tree: Map<string | null, Span[]>,
  parentId: string | null = null,
  depth = 0
): Array<{ span: Span; depth: number }> {
  const result: Array<{ span: Span; depth: number }> = [];
  for (const span of tree.get(parentId) ?? []) {
    result.push({ span, depth });
    result.push(...flattenTree(tree, span.span_id, depth + 1));
  }
  return result;
}

export default function TraceWaterfall({ spans, traceId }: TraceWaterfallProps) {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { flatSpans, traceStartMs, traceDurationMs } = useMemo(() => {
    if (!spans.length) return { flatSpans: [], traceStartMs: 0, traceDurationMs: 0 };
    const tree = buildSpanTree(spans);
    const flat = flattenTree(tree);
    const traceStart = Math.min(...spans.map((s) => s.started_at));
    const traceEnd = Math.max(...spans.map((s) => s.ended_at));
    return {
      flatSpans: flat,
      traceStartMs: traceStart,
      traceDurationMs: traceEnd - traceStart,
    };
  }, [spans]);

  const totalHeight = flatSpans.length * ROW_HEIGHT + 40;

  function getBarProps(span: Span, containerWidth: number) {
    const safeDuration = Math.max(traceDurationMs, 1);
    const barAreaWidth = containerWidth - LABEL_WIDTH;
    const offsetMs = span.started_at - traceStartMs;
    const x = LABEL_WIDTH + (offsetMs / safeDuration) * barAreaWidth;
    const w = Math.max(MIN_BAR_WIDTH, (span.duration_ms / safeDuration) * barAreaWidth);
    return { x, w };
  }

  if (!flatSpans.length) {
    return <div className={styles.empty}>No spans found for this trace.</div>;
  }

  const containerWidth = containerRef.current?.clientWidth ?? 1000;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.traceId}>Trace {traceId.slice(0, 16)}...</span>
        <span className={styles.totalDuration}>{traceDurationMs.toFixed(1)}ms total</span>
        <span className={styles.spanCount}>{spans.length} spans</span>
      </div>

      <div className={styles.waterfallWrap} ref={containerRef}>
        <svg
          width="100%"
          height={totalHeight}
          className={styles.waterfall}
          role="img"
          aria-label={`Trace waterfall: ${spans.length} spans, ${traceDurationMs.toFixed(1)}ms total`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const x = LABEL_WIDTH + frac * (containerWidth - LABEL_WIDTH);
            const ms = frac * traceDurationMs;
            return (
              <g key={frac}>
                <line x1={x} y1={0} x2={x} y2={totalHeight} stroke="#1E293B" strokeWidth={1} />
                <text x={x + 4} y={14} fill="#475569" fontSize={10} fontFamily="Geist Mono">
                  {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms.toFixed(0)}ms`}
                </text>
              </g>
            );
          })}

          {flatSpans.map(({ span, depth }, i) => {
            const y = i * ROW_HEIGHT + 24;
            const colour = span.status === 'error' ? '#EF4444' : SPAN_COLOURS[depth % SPAN_COLOURS.length];
            const { x, w } = getBarProps(span, containerWidth);
            const isSelected = selectedSpan?.span_id === span.span_id;

            return (
              <g
                key={span.span_id}
                className={styles.spanRow}
                onClick={() => setSelectedSpan(isSelected ? null : span)}
                role="button"
                aria-label={`Span: ${span.name}, ${span.duration_ms.toFixed(1)}ms`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedSpan(isSelected ? null : span)}
              >
                <rect
                  x={0}
                  y={y - 2}
                  width="100%"
                  height={ROW_HEIGHT - 2}
                  fill={isSelected ? 'rgba(59,130,246,0.08)' : 'transparent'}
                  className={styles.rowBg}
                />

                {depth > 0 && (
                  <line
                    x1={LABEL_WIDTH - 20 + (depth - 1) * 16}
                    y1={y + ROW_HEIGHT / 2}
                    x2={LABEL_WIDTH - 4 + depth * 16}
                    y2={y + ROW_HEIGHT / 2}
                    stroke="#2D3748"
                    strokeWidth={1}
                  />
                )}

                <text
                  x={LABEL_WIDTH - 8 + depth * 16}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fill={span.status === 'error' ? '#EF4444' : '#94A3B8'}
                  fontSize={11}
                  fontFamily="Geist Mono"
                  textAnchor="end"
                  className={styles.spanLabel}
                >
                  {span.name.length > 28 - depth * 2 ? span.name.slice(0, 28 - depth * 2) + '...' : span.name}
                </text>

                <rect
                  x={x}
                  y={y + 4}
                  width={w}
                  height={ROW_HEIGHT - 12}
                  fill={colour}
                  fillOpacity={isSelected ? 1 : 0.8}
                  rx={3}
                  className={styles.spanBar}
                />

                {w > 50 && (
                  <text x={x + 6} y={y + ROW_HEIGHT / 2 + 4} fill="rgba(255,255,255,0.9)" fontSize={10} fontFamily="Geist Mono">
                    {span.duration_ms >= 1000 ? `${(span.duration_ms / 1000).toFixed(2)}s` : `${span.duration_ms.toFixed(0)}ms`}
                  </text>
                )}

                {span.status === 'error' && (
                  <text x={x + w + 6} y={y + ROW_HEIGHT / 2 + 4} fill="#EF4444" fontSize={10}>
                    x
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {selectedSpan && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedSpan.name}</span>
            <span className={styles.detailDuration}>
              {selectedSpan.duration_ms >= 1000
                ? `${(selectedSpan.duration_ms / 1000).toFixed(3)}s`
                : `${selectedSpan.duration_ms.toFixed(2)}ms`}
            </span>
            <button className={styles.detailClose} onClick={() => setSelectedSpan(null)} aria-label="Close span detail">
              x
            </button>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailField}>
              <span className={styles.fieldLabel}>Span ID</span>
              <code className={styles.fieldValue}>{selectedSpan.span_id}</code>
            </div>
            <div className={styles.detailField}>
              <span className={styles.fieldLabel}>Status</span>
              <span className={`${styles.statusBadge} ${styles[selectedSpan.status]}`}>{selectedSpan.status.toUpperCase()}</span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.fieldLabel}>Kind</span>
              <code className={styles.fieldValue}>{selectedSpan.kind}</code>
            </div>
            <div className={styles.detailField}>
              <span className={styles.fieldLabel}>Started</span>
              <code className={styles.fieldValue}>{new Date(selectedSpan.started_at).toISOString()}</code>
            </div>
          </div>

          {selectedSpan.error_message && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>x</span>
              {selectedSpan.error_message}
            </div>
          )}

          {Object.keys(selectedSpan.attributes ?? {}).length > 0 && (
            <div className={styles.attributeList}>
              <h4 className={styles.attributeTitle}>Attributes</h4>
              {Object.entries(selectedSpan.attributes).map(([k, v]) => (
                <div key={k} className={styles.attribute}>
                  <code className={styles.attrKey}>{k}</code>
                  <code className={styles.attrValue}>{String(v)}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
