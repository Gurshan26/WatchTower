import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TraceWaterfall from '../../src/components/Traces/TraceWaterfall';

const MOCK_SPANS = [
  {
    span_id: 'root-span-id-001',
    parent_span_id: null,
    name: 'GET /api/users',
    status: 'ok' as const,
    duration_ms: 250,
    started_at: 1000000,
    ended_at: 1000250,
    kind: 'SERVER',
    attributes: { 'http.method': 'GET', 'http.status_code': 200 },
    events: [],
    error_message: undefined,
  },
  {
    span_id: 'child-span-id-002',
    parent_span_id: 'root-span-id-001',
    name: 'db.query',
    status: 'ok' as const,
    duration_ms: 80,
    started_at: 1000010,
    ended_at: 1000090,
    kind: 'CLIENT',
    attributes: { 'db.system': 'postgresql' },
    events: [],
    error_message: undefined,
  },
  {
    span_id: 'error-span-id-003',
    parent_span_id: 'root-span-id-001',
    name: 'auth.verify',
    status: 'error' as const,
    duration_ms: 30,
    started_at: 1000100,
    ended_at: 1000130,
    kind: 'INTERNAL',
    attributes: {},
    events: [],
    error_message: 'Token expired',
  },
];

describe('TraceWaterfall', () => {
  it('renders the SVG waterfall', () => {
    render(<TraceWaterfall spans={MOCK_SPANS} traceId="test-trace-id-123" />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('shows the trace ID', () => {
    render(<TraceWaterfall spans={MOCK_SPANS} traceId="abcdef1234567890" />);
    expect(screen.getByText(/abcdef1234567/)).toBeInTheDocument();
  });

  it('shows total duration', () => {
    render(<TraceWaterfall spans={MOCK_SPANS} traceId="test" />);
    expect(screen.getByText(/ms total/)).toBeInTheDocument();
  });

  it('shows span count', () => {
    render(<TraceWaterfall spans={MOCK_SPANS} traceId="test" />);
    expect(screen.getByText(/3 spans/)).toBeInTheDocument();
  });

  it('renders empty state for no spans', () => {
    render(<TraceWaterfall spans={[]} traceId="empty" />);
    expect(screen.getByText(/No spans found/)).toBeInTheDocument();
  });

  it('shows span detail when span is clicked', () => {
    render(<TraceWaterfall spans={MOCK_SPANS} traceId="test" />);
    const spanRows = document.querySelectorAll('[role="button"]');
    fireEvent.click(spanRows[0]);
    expect(screen.getByText('Span ID')).toBeInTheDocument();
    expect(screen.getByText('http.method')).toBeInTheDocument();
  });

  it('shows error message for error spans', () => {
    render(<TraceWaterfall spans={MOCK_SPANS} traceId="test" />);
    const spanRows = document.querySelectorAll('[role="button"]');
    fireEvent.click(spanRows[2]);
    expect(screen.getByText(/Token expired/)).toBeInTheDocument();
  });

  it('closes detail panel when clicked again', () => {
    render(<TraceWaterfall spans={MOCK_SPANS} traceId="test" />);
    const spanRows = document.querySelectorAll('[role="button"]');
    fireEvent.click(spanRows[0]);
    fireEvent.click(spanRows[0]);
    expect(screen.queryByText('http.method')).not.toBeInTheDocument();
  });

  it('has accessible role on SVG', () => {
    render(<TraceWaterfall spans={MOCK_SPANS} traceId="test" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
