import ChaosConsole from '@/components/Chaos/ChaosConsole';

export default function ChaosPage() {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header>
        <h1>Chaos Console</h1>
        <p style={{ color: 'var(--text-2)' }}>Break things on purpose. Then watch exactly what happened.</p>
      </header>
      <ChaosConsole />
    </section>
  );
}
