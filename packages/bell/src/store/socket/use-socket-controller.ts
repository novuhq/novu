import { useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from '../auth.context';
import { WS_URL } from '../../api/shared';
import { IAuthContext, ISocket } from '../../index';

let socket;

export function useSocketController() {
  const { token } = useContext<IAuthContext>(AuthContext);
  const [socketInstance, setSocketInstance] = useState<ISocket | null>(null);

  useEffect(() => {
    console.log({ token });
    if (token && !socket) {
      socket = io(WS_URL, {
        reconnectionDelayMax: 10000,
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
