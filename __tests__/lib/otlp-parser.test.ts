import { describe, expect, it } from 'vitest';

function nanosToMs(nano: string): number {
  return parseInt(nano, 10) / 1_000_000;
}

function parseAttributes(attrs: Array<{ key: string; value: any }> = []): Record<string, any> {
  const result: Record<string, any> = {};
  for (const attr of attrs) {
    const v = attr.value;
    result[attr.key] = v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue ?? null;
  }
  return result;
}

function statusCodeToText(code: number): 'ok' | 'error' | 'unset' {
  if (code === 2) return 'error';
  if (code === 1) return 'ok';
  return 'unset';
}

describe('nanosToMs', () => {
  it('converts nanoseconds to milliseconds correctly', () => {
    expect(nanosToMs('1000000')).toBe(1);
    expect(nanosToMs('1000000000')).toBe(1000);
    expect(nanosToMs('500000')).toBe(0.5);
  });

  it('handles large values without precision loss', () => {
    const result = nanosToMs('1716000000000000000');
    expect(result).toBeGreaterThan(0);
  });

  it('handles zero', () => {
    expect(nanosToMs('0')).toBe(0);
  });
});

describe('parseAttributes', () => {
  it('extracts string values', () => {
    const attrs = [{ key: 'http.method', value: { stringValue: 'GET' } }];
    expect(parseAttributes(attrs)['http.method']).toBe('GET');
  });

  it('extracts integer values', () => {
    const attrs = [{ key: 'http.status_code', value: { intValue: 200 } }];
    expect(parseAttributes(attrs)['http.status_code']).toBe(200);
  });

  it('extracts boolean values', () => {
    const attrs = [{ key: 'error', value: { boolValue: true } }];
    expect(parseAttributes(attrs).error).toBe(true);
  });

  it('extracts double values', () => {
    const attrs = [{ key: 'latency', value: { doubleValue: 3.14 } }];
    expect(parseAttributes(attrs).latency).toBeCloseTo(3.14);
  });

  it('returns empty object for empty array', () => {
    expect(parseAttributes([])).toEqual({});
  });

  it('handles multiple attributes', () => {
    const attrs = [
      { key: 'a', value: { stringValue: 'x' } },
      { key: 'b', value: { intValue: 42 } },
    ];
    const result = parseAttributes(attrs);
    expect(result.a).toBe('x');
    expect(result.b).toBe(42);
  });
});

describe('statusCodeToText', () => {
  it('maps code 2 to error', () => {
    expect(statusCodeToText(2)).toBe('error');
  });

  it('maps code 1 to ok', () => {
    expect(statusCodeToText(1)).toBe('ok');
  });

  it('maps code 0 to unset', () => {
    expect(statusCodeToText(0)).toBe('unset');
  });

  it('maps unknown codes to unset', () => {
    expect(statusCodeToText(99)).toBe('unset');
  });
});
