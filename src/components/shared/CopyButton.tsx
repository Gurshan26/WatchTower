'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }

  return (
    <button
      onClick={onCopy}
      style={{
        border: '1px solid var(--border-2)',
        background: 'var(--surface-2)',
        color: 'var(--text-2)',
        borderRadius: 4,
        fontSize: 11,
        padding: '2px 8px',
        cursor: 'pointer',
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
