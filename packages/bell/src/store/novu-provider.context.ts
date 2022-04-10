import React from 'react';
import { INovuProviderProps } from '../components';

export const NovuContext = React.createContext<INovuProviderProps>({
  appId: null,
  backendUrl: null,
  userId: null,
  clientId: null,
  firstName: null,
  lastName: null,
  email: null,
  phone: null,
} as any);
