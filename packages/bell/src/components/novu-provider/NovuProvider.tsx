import React from 'react';
import { NovuContext } from '../../store/novu-provider.context';
import { ColorScheme } from '../../index';
import { API_URL } from '../../api/shared';

export function NovuProvider({
  children,
  backendUrl = API_URL,
  subscriberId,
  applicationIdentifier,
  colorScheme,
}: {
  children: JSX.Element;
  backendUrl?: string;
  subscriberId: string;
  applicationIdentifier: string;
  colorScheme?: ColorScheme;
}) {
  return (
    <NovuContext.Provider
      value={{
        backendUrl: backendUrl,
        subscriberId: subscriberId,
        applicationIdentifier: applicationIdentifier,
        colorScheme: colorScheme || 'light',
      }}>
      {children}
    </NovuContext.Provider>
  );
}
