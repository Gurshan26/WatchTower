import { subscribeToFeed } from '@/lib/live-feed';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          if (keepalive) clearInterval(keepalive);
        }
      };

      const db = getDb();
      const stats = db
        .prepare(`
          SELECT
            (SELECT COUNT(*) FROM traces WHERE started_at >= ?) as traces,
            (SELECT COUNT(*) FROM logs WHERE timestamp >= ? AND severity IN ('ERROR','FATAL')) as errors,
            (SELECT COUNT(*) FROM alerts WHERE status = 'firing') as active_alerts
        `)
        .get(Date.now() - 3_600_000, Date.now() - 3_600_000) as Record<string, number>;

      send({ type: 'snapshot', ...stats, timestamp: Date.now() });

      unsubscribe = subscribeToFeed(send);

      keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          if (keepalive) clearInterval(keepalive);
        }
      }, 25000);
    },

    cancel() {
      if (unsubscribe) unsubscribe();
      if (keepalive) clearInterval(keepalive);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
