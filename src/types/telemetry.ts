export type TraceStatus = 'ok' | 'error' | 'unset';

export interface TraceRow {
  trace_id: string;
  service_name: string;
  root_name: string;
  status: TraceStatus;
  duration_ms: number;
  span_count: number;
  started_at: number;
  ended_at: number;
}

export interface SpanRow {
  span_id: string;
  trace_id: string;
  parent_span_id: string | null;
  name: string;
  service_name: string;
  kind: string;
  status: TraceStatus;
  error_message: string | null;
  duration_ms: number;
  started_at: number;
  ended_at: number;
  attributes: string;
  events: string;
}

export interface LogRow {
  id: number;
  timestamp: number;
  severity: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  body: string;
  service_name: string;
  trace_id: string | null;
  span_id: string | null;
  attributes: string;
}

export interface ErrorGroup {
  id: number;
  fingerprint: string;
  title: string;
  message: string;
  service_name: string;
  first_seen: number;
  last_seen: number;
  occurrence_count: number;
  status: 'open' | 'resolved' | 'ignored';
  stack_trace: string | null;
  sample_trace_id: string | null;
}
