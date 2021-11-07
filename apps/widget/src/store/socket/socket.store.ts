import React from 'react';

export interface ISocket {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (eventName: string, callback: (data: any) => void) => void;
  off: (eventName: string) => void;
}

export interface ISocketContext {
  socket: ISocket | null;
}

export const SocketContext = React.createContext<ISocketContext>({
  socket: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
