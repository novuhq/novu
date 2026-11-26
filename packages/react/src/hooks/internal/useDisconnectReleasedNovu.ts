import type { Novu } from '@novu/js';
import { useEffect, useRef } from 'react';

/**
 * Closes the socket of a Novu instance once the provider stops using it, because it was replaced or unmounted.
 * Without this the socket stays open and keeps reconnecting with its old token.
 *
 * The close is deferred by a tick so StrictMode's simulated unmount and remount keeps the instance it still renders.
 */
export const useDisconnectReleasedNovu = (novu: Novu) => {
  const pending = useRef<{ novu: Novu; timeoutId: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    if (pending.current?.novu === novu) {
      clearTimeout(pending.current.timeoutId);
      pending.current = null;
    }

    return () => {
      const timeoutId = setTimeout(() => {
        novu.socket.disconnect();
      }, 0);
      pending.current = { novu, timeoutId };
    };
  }, [novu]);
};
