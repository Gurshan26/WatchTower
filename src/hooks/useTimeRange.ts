'use client';

import { useMemo, useState } from 'react';

const RANGES: Record<string, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
};

export function useTimeRange(initial: keyof typeof RANGES = '1h') {
  const [range, setRange] = useState<keyof typeof RANGES>(initial);

  const windowMs = useMemo(() => RANGES[range] ?? RANGES['1h'], [range]);
  const to = Date.now();
  const from = to - windowMs;

  return {
    range,
    setRange,
    from,
    to,
    windowMs,
  };
}
