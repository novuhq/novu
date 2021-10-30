import { useContext } from 'react';
import { ISocketContext, SocketContext } from '../store/socket/socket.store';

export function useSocket() {
  const { socket } = useContext<ISocketContext>(SocketContext);

  return {
    socket,
  };
}
