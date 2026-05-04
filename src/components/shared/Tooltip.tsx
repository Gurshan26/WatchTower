'use client';

import { useState } from 'react';

export default function Tooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '1px solid var(--border-2)',
          background: 'var(--surface-2)',
          color: 'var(--text-2)',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ?
      </button>
      {open && (
        <span
          style={{
            position: 'absolute',
            top: '120%',
            right: 0,
            width: 220,
            padding: 8,
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--surface)',
            color: 'var(--text-2)',
            fontSize: 12,
            zIndex: 20,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
