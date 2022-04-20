import React from 'react';
import { INovuProviderContext } from '../index';

export const NovuContext = React.createContext<INovuProviderContext>({
  backendUrl: null,
  subscriberId: null,
  colorScheme: 'light',
  initialized: false,
  bellLoading: (isLoading: boolean) => {},
});
