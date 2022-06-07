import { useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from '../auth.context';
import { IAuthContext, ISocket } from '../../index';
import { NovuContext } from '../novu-provider.context';

let socket;

export function useSocketController() {
  const { socketUrl } = useContext(NovuContext);
  const { token } = useContext<IAuthContext>(AuthContext);
  const [socketInstance, setSocketInstance] = useState<ISocket | null>(null);

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
