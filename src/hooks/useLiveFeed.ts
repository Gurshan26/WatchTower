'use client';

import { useEffect, useRef, useState } from 'react';

export interface FeedEvent {
  type: 'trace' | 'error_log' | 'alert' | 'snapshot' | string;
  traceIds?: string[];
  count?: number;
  active_alerts?: number;
  traces?: number;
  errors?: number;
  timestamp: number;
  [key: string]: unknown;
}

const API_BASE = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export function useLiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let retryCount = 0;

    function connect() {
      es = new EventSource(`${API_BASE}/api/telemetry/stream`);

      es.onopen = () => {
        setConnected(true);
        retryCount = 0;
      };

      es.onerror = () => {
        setConnected(false);
        es?.close();
        const delay = Math.min(1000 * Math.pow(2, retryCount++), 30000);
        retryTimeout = setTimeout(connect, delay);
      };

      es.onmessage = (e) => {
        if (pausedRef.current) return;
        try {
          const event = { ...JSON.parse(e.data), timestamp: Date.now() } as FeedEvent;
          setEvents((prev) => [event, ...prev].slice(0, 100));
        } catch {
          // ignore bad event payload
        }
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
    };
  }, []);

  return { events, connected, paused, setPaused };
}
