import React from 'react';
import { NovuContext } from '../../store/novu-provider.context';

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
  children: JSX.Element;
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
