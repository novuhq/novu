import React from 'react';
import { useSocketController } from './socket/use-socket-controller';
import { SocketContext } from './socket/socket.store';

export function SocketInitializationProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocketController();

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
}
