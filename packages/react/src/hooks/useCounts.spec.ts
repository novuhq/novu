import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCounts } from './useCounts';

const { mockCount, mockNovu, syncHandlers } = vi.hoisted(() => {
  const syncHandlers = new Map<string, (payload: unknown) => void>();
  const mockCount = vi.fn();

  const mockNovu = {
    applicationIdentifier: 'test-app',
    subscriberId: 'test-sub',
    contextKey: 'test-ctx',
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      syncHandlers.set(event, handler);

      return () => {
        syncHandlers.delete(event);
      };
    }),
    notifications: {
      count: mockCount,
    },
  };

  return { mockCount, mockNovu, syncHandlers };
});

vi.mock('./NovuProvider', () => ({
  useNovu: () => mockNovu,
  useRealtime: () => false,
  NovuProvider: ({ children }: { children: ReactNode }) => children,
}));

describe('useCounts', () => {
  const filters = [{ read: false }];

  beforeEach(() => {
    mockCount.mockReset();
    syncHandlers.clear();
    mockNovu.on.mockClear();
    mockCount.mockResolvedValue({ data: { counts: [{ filter: { read: false }, count: 2 }] } });
  });

  it('refetches counts for all active filters when a notification status sync event fires', async () => {
    const { result } = renderHook(() => useCounts({ filters, realtime: false }));

    await waitFor(() => expect(mockCount).toHaveBeenCalledWith({ filters }));
    await waitFor(() => expect(result.current.counts).toEqual([{ filter: { read: false }, count: 2 }]));

    const readResolved = syncHandlers.get('notification.read.resolved');
    expect(readResolved).toBeDefined();

    mockCount.mockClear();

    await act(async () => {
      readResolved?.({ result: { id: 'notification-1', isRead: true } });
    });

    await waitFor(() => expect(mockCount).toHaveBeenCalledWith({ filters }));
  });
});
