'use client';

import { useSyncExternalStore } from 'react';
import { getSocketStatus, type SocketStatus, subscribeSocketStatus } from '../lib/socket-status';

export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(subscribeSocketStatus, getSocketStatus, () => 'connecting' as const);
}
