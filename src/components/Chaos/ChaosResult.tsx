interface ChaosResultProps {
  message: string;
  traceId?: string;
  error?: boolean;
}

export default function ChaosResult({ message, traceId, error }: ChaosResultProps) {
  return (
    <section
      style={{
        border: `1px solid ${error ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
        background: error ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
        borderRadius: 6,
        padding: 10,
        display: 'grid',
        gap: 4,
      }}
    >
      <p>{message}</p>
      {traceId && (
        <a href={`/dashboard/traces/${traceId}`} style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {'View trace -> '}
          {traceId.slice(0, 16)}...
        </a>
      )}
    </section>
  );
}
