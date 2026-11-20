'use client';

import { useNovu } from '@novu/react';
import { useEffect } from 'react';
import { setSocketStatus } from '../lib/socket-status';

/**
 * Playground wiring: mirror SDK socket events into the socket status store.
 */
export function ConnectionTracker() {
  const novu = useNovu();

  useEffect(() => {
    const cleanupPending = novu.on('socket.connect.pending', () => setSocketStatus('connecting'));
    const cleanupResolved = novu.on('socket.connect.resolved', ({ error }) =>
      setSocketStatus(error ? 'offline' : 'online')
    );
    const cleanupDisconnected = novu.on('socket.disconnect.resolved', () => setSocketStatus('offline'));

    return () => {
      cleanupPending();
      cleanupResolved();
      cleanupDisconnected();
    };
  }, [novu]);

  return null;
}
