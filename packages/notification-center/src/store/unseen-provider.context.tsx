import React, { useEffect } from 'react';
import { useSocket, useUnseenController } from '../hooks';
import { UnseenCountContext } from './unseen-count.context';

export function UnseenProvider({ children }: { children: React.ReactNode }) {
  const { unseenCount, setUnseenCount } = useUnseenController();
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('unseen_count_changed', (onData: { unseenCount: number }) => {
        if (!isNaN(onData?.unseenCount)) {
          setUnseenCount(onData.unseenCount);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('unseen_count_changed');
      }
    };
  }, [socket]);

  return <UnseenCountContext.Provider value={{ unseenCount, setUnseenCount }}>{children}</UnseenCountContext.Provider>;
}
