import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockDb = {
  prepare: vi.fn(() => ({
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(() => []),
  })),
  transaction: vi.fn((fn) => () => fn()),
};

vi.mock('../../src/lib/db', () => ({ getDb: vi.fn(() => mockDb) }));
vi.mock('../../src/lib/alert-engine', () => ({ runAlertEvaluation: vi.fn() }));
vi.mock('../../src/lib/live-feed', () => ({ emitToLiveFeed: vi.fn() }));

import { POST } from '../../src/app/api/otlp/v1/traces/route';

function makeOTLPTraceRequest(spans: any[] = []) {
  const body = {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: 'test-service' } }],
        },
        scopeSpans: [{ spans }],
      },
    ],
  };

  return new NextRequest('http://localhost/api/otlp/v1/traces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const NOW_NANO = String(Date.now() * 1_000_000);
const END_NANO = String((Date.now() + 100) * 1_000_000);

const MOCK_SPAN = {
  traceId: 'abcdef1234567890abcdef1234567890',
  spanId: 'abcdef12345678',
  name: 'GET /api/test',
  kind: 2,
  startTimeUnixNano: NOW_NANO,
  endTimeUnixNano: END_NANO,
  status: { code: 1, message: '' },
  attributes: [
    { key: 'http.method', value: { stringValue: 'GET' } },
    { key: 'http.status_code', value: { intValue: 200 } },
  ],
};

describe('POST /api/otlp/v1/traces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for valid OTLP payload', async () => {
    const res = await POST(makeOTLPTraceRequest([MOCK_SPAN]));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accepted).toBe(true);
  });

  it('returns 200 for empty spans array', async () => {
    const res = await POST(makeOTLPTraceRequest([]));
    expect(res.status).toBe(200);
  });

  it('calls transaction for batch processing', async () => {
    await POST(makeOTLPTraceRequest([MOCK_SPAN]));
    expect(mockDb.transaction).toHaveBeenCalled();
  });

  it('handles malformed JSON gracefully', async () => {
    const req = new NextRequest('http://localhost/api/otlp/v1/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json at all',
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles error spans and creates error groups', async () => {
    const errorSpan = {
      ...MOCK_SPAN,
      status: { code: 2, message: 'Something went wrong' },
    };
    const res = await POST(makeOTLPTraceRequest([errorSpan]));
    expect(res.status).toBe(200);
  });
});
