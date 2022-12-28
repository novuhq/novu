import { useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

import type { Socket, ISession } from '../shared/interfaces';

export const useInitializeSocket = ({ socketUrl }: { socketUrl: string }) => {
  const socketRef = useRef<Socket | undefined>();

  const initializeSocket = useCallback(
    ({ token }: ISession) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      if (token) {
        socketRef.current = io(socketUrl, {
          reconnectionDelayMax: 10000,
          transports: ['websocket'],
          query: {
            token: `${token}`,
          },
        });

        socketRef.current.on('connect_error', (error: any) => {
          // eslint-disable-next-line no-console
          console.error(error.message);
        });
      }
    },
    [socketRef]
  );

  return {
    socket: socketRef.current,
    initializeSocket,
  };
};
