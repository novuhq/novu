import React from 'react';
import { NovuContext } from '../../store/novu-provider.context';
import { INotificationCenter } from '../notification-center';

export interface INovuProviderProps {
  appId?: string;
  backendUrl?: string;
  userId?: string;
  clientId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export function NovuProvider({
  children,
  appId,
  backendUrl,
  userId,
  clientId,
  firstName,
  lastName,
  email,
  phone,
}: {
  children: INotificationCenter;
  appId: string;
  backendUrl: string;
  userId: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  return (
    <NovuContext.Provider
      value={{
        appId: appId,
        backendUrl: backendUrl,
        userId: userId,
        clientId: clientId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
      }}>
      {children}
    </NovuContext.Provider>
  );
}
