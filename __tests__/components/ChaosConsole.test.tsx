import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChaosConsole from '../../src/components/Chaos/ChaosConsole';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      triggered: 1,
      message: 'Triggered 1 database_connection error. Check Traces and Errors tabs.',
      traceId: 'abc123def456789012345678',
    }),
  });
});

describe('ChaosConsole', () => {
  it('renders all 4 chaos action cards', () => {
    render(<ChaosConsole />);
    expect(screen.getByText('Trigger Error')).toBeInTheDocument();
    expect(screen.getByText('Slow Request')).toBeInTheDocument();
    expect(screen.getByText('Cascade Failure')).toBeInTheDocument();
    expect(screen.getByText('External HTTP Failure')).toBeInTheDocument();
  });

  it('shows warning banner', () => {
    render(<ChaosConsole />);
    expect(screen.getByText(/Chaos Console/)).toBeInTheDocument();
  });

  it('expands config panel when action clicked', () => {
    render(<ChaosConsole />);
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Error scenario')).toBeInTheDocument();
  });

  it('collapses config panel on second click', () => {
    render(<ChaosConsole />);
    fireEvent.click(screen.getByText('Trigger Error'));
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.queryByText('Error scenario')).not.toBeInTheDocument();
  });

  it('shows run button when action expanded', () => {
    render(<ChaosConsole />);
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText(/Run Trigger Error/)).toBeInTheDocument();
  });

  it('calls fetch on run', async () => {
    render(<ChaosConsole />);
    fireEvent.click(screen.getByText('Trigger Error'));
    fireEvent.click(screen.getByText(/Run Trigger Error/));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chaos/error',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('shows result after successful run', async () => {
    render(<ChaosConsole />);
    fireEvent.click(screen.getByText('Trigger Error'));
    fireEvent.click(screen.getByText(/Run Trigger Error/));
    await waitFor(() => {
      expect(screen.getByText(/Triggered 1 database_connection error/)).toBeInTheDocument();
    });
  });

  it('shows trace link in result', async () => {
    render(<ChaosConsole />);
    fireEvent.click(screen.getByText('Trigger Error'));
    fireEvent.click(screen.getByText(/Run Trigger Error/));
    await waitFor(() => {
      expect(screen.getByText(/View trace/)).toBeInTheDocument();
    });
  });
});
