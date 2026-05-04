import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const insertMetric = db.prepare(`
      INSERT INTO metrics (name, value, unit, service_name, labels, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction(() => {
      for (const resourceMetric of body.resourceMetrics ?? []) {
        const serviceName =
          resourceMetric.resource?.attributes?.find((a: any) => a.key === 'service.name')?.value?.stringValue ?? 'unknown';

        for (const scopeMetric of resourceMetric.scopeMetrics ?? []) {
          for (const metric of scopeMetric.metrics ?? []) {
            const name = metric.name;
            const unit = metric.unit ?? '';

            const dataPoints = metric.gauge?.dataPoints ?? metric.sum?.dataPoints ?? metric.histogram?.dataPoints ?? [];

            for (const dp of dataPoints) {
              const timestamp = parseInt(dp.timeUnixNano, 10) / 1_000_000;
              const labels: Record<string, string> = {};
              for (const attr of dp.attributes ?? []) {
                labels[attr.key] = attr.value?.stringValue ?? String(attr.value?.intValue ?? attr.value?.doubleValue ?? '');
              }

              if (metric.histogram?.dataPoints) {
                const sum = Number(dp.sum ?? 0);
                const count = Number(dp.count ?? 0);
                const value = count > 0 ? sum / count : 0;
                insertMetric.run(name, value, unit, serviceName, JSON.stringify(labels), timestamp);
              } else {
                const value = Number(dp.asDouble ?? dp.asInt ?? 0);
                insertMetric.run(name, value, unit, serviceName, JSON.stringify(labels), timestamp);
              }
            }
          }
        }
      }
    });

    insertAll();
    return NextResponse.json({ accepted: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
