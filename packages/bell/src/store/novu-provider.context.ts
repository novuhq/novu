import React from 'react';
import { INovuProviderContext } from '../index';

export const NovuContext = React.createContext<INovuProviderContext>({
  backendUrl: null,
  subscriberId: null,
  initialized: false,
  socketUrl: null,
  onLoad: null,
});
