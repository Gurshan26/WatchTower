interface SpanDetailProps {
  span: {
    span_id: string;
    name: string;
    kind: string;
    status: 'ok' | 'error' | 'unset';
    started_at: number;
    duration_ms: number;
    attributes?: Record<string, unknown>;
    error_message?: string | null;
  };
  onClose?: () => void;
}

export default function SpanDetail({ span, onClose }: SpanDetailProps) {
  return (
    <section style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', padding: 10, display: 'grid', gap: 8 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>{span.name}</strong>
        <code style={{ color: 'var(--text-2)' }}>{span.duration_ms.toFixed(2)}ms</code>
        {onClose && (
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-2)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
          >
            Close
          </button>
        )}
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        <div>Span: {span.span_id}</div>
        <div>Status: {span.status}</div>
        <div>Kind: {span.kind}</div>
        <div>Started: {new Date(span.started_at).toISOString()}</div>
      </div>
      {span.error_message && <div style={{ color: 'var(--red)' }}>{span.error_message}</div>}
      {span.attributes && Object.keys(span.attributes).length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          {Object.entries(span.attributes).map(([k, v]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <span style={{ color: 'var(--text-3)' }}>{k}</span>
              <span>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
