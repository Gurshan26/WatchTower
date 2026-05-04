'use client';

import { useEffect, useState } from 'react';

interface Props {
  onChange: (args: { severity: string; query: string }) => void;
}

export default function LogSearch({ onChange }: Props) {
  const [severity, setSeverity] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const id = setTimeout(() => onChange({ severity, query }), 300);
    return () => clearTimeout(id);
  }, [severity, query, onChange]);

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
      <select
        value={severity}
        onChange={(e) => setSeverity(e.target.value)}
        style={{ border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 4, padding: '6px 8px' }}
      >
        <option value="">All levels</option>
        <option value="TRACE">TRACE</option>
        <option value="DEBUG">DEBUG</option>
        <option value="INFO">INFO</option>
        <option value="WARN">WARN</option>
        <option value="ERROR">ERROR</option>
        <option value="FATAL">FATAL</option>
      </select>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search log body"
        style={{
          border: '1px solid var(--border-2)',
          background: 'var(--surface-2)',
          color: 'var(--text)',
          borderRadius: 4,
          padding: '6px 8px',
          flex: 1,
        }}
      />
    </div>
  );
}
