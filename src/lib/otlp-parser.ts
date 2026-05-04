export interface OTLPAttribute {
  key: string;
  value: {
    stringValue?: string;
    intValue?: number;
    doubleValue?: number;
    boolValue?: boolean;
  };
}

export function nanosToMs(nano: string): number {
  return parseInt(nano, 10) / 1_000_000;
}

export function parseAttributes(attrs: OTLPAttribute[] = []): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const attr of attrs) {
    const v = attr.value;
    result[attr.key] = v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue ?? null;
  }
  return result;
}

export function statusCodeToText(code: number): 'ok' | 'error' | 'unset' {
  if (code === 2) return 'error';
  if (code === 1) return 'ok';
  return 'unset';
}

export function spanKindToText(kind: number): string {
  const kinds = ['UNSPECIFIED', 'INTERNAL', 'SERVER', 'CLIENT', 'PRODUCER', 'CONSUMER'];
  return kinds[kind] ?? 'INTERNAL';
}
