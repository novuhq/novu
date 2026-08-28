'use client';

import { useNovu } from '@novu/react';
import { useEffect } from 'react';
import { setApiToken } from '../lib/api-token';
import { setSocketStatus } from '../lib/socket-status';

/**
 * Playground wiring: mirror SDK connect events into the socket status store, and
 * capture the session JWT for the recent-conversations list (not wrapped by the SDK).
 */
export function ConnectionTracker() {
  const novu = useNovu();

  useEffect(() => {
    const cleanupPending = novu.on('socket.connect.pending', () => setSocketStatus('connecting'));
    const cleanupResolved = novu.on('socket.connect.resolved', ({ error }) =>
      setSocketStatus(error ? 'offline' : 'online')
    );
    const cleanupSession = novu.on('session.initialize.resolved', ({ data }) => {
      if (data?.token) setApiToken(data.token);
    });

    return () => {
      cleanupPending();
      cleanupResolved();
      cleanupSession();
    };
  }, [novu]);

  return null;
}
