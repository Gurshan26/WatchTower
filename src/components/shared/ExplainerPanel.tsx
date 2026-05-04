'use client';

import { useState } from 'react';

export default function ExplainerPanel({ title = 'What is this?', content }: { title?: string; content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'inline-grid', gap: 6, justifyItems: 'end' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          border: '1px solid var(--border-2)',
          background: 'var(--surface-2)',
          color: 'var(--text-2)',
          borderRadius: 4,
          padding: '2px 8px',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        {title}
      </button>
      {open && (
        <div
          style={{
            maxWidth: 320,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            borderRadius: 6,
            padding: 10,
            color: 'var(--text-2)',
            fontSize: 12,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
