import { useContext } from 'react';
import { SocketContext } from '../store/socket/socket.store';
import { ISocketContext } from '../shared/interfaces';

export function useSocket() {
  const { socket } = useContext<ISocketContext>(SocketContext);

  return {
    socket,
  };
}
