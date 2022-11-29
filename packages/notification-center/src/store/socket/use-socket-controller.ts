import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth, useNovuContext } from '../../hooks';
import { ISocket } from '../../shared/interfaces';

let socket;

export function useSocketController() {
  const [socketInstance, setSocketInstance] = useState<ISocket | null>(null);
  const { socketUrl } = useNovuContext();
  const { token } = useAuth();

  useEffect(() => {
    if (token && !socket) {
      socket = io(socketUrl, {
        reconnectionDelayMax: 10000,
        transports: ['websocket'],
        query: {
          token: `${token}`,
        },
      });

      socket.on('connect_error', function handleSocketConnectError(e) {
        // eslint-disable-next-line no-console
        console.error(e);
      });

      setSocketInstance(socket);
    }

    return () => {
      socket = null;
      socket?.disconnect();
    };
  }, [token]);

  return {
    socket: socketInstance,
  };
}
