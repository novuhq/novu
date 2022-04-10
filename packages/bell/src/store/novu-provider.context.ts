import React from 'react';
import { INovuProviderContext } from '../index';

export const NovuContext = React.createContext<INovuProviderContext>({
  appId: null,
  backendUrl: null,
  userId: null,
  clientId: null,
  firstName: null,
  lastName: null,
  email: null,
  phone: null,
} as any);
