import React from 'react';
import { ISocketContext } from '../../index';

export const SocketContext = React.createContext<ISocketContext>({
  socket: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
