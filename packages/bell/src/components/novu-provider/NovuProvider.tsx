import React from 'react';
import { NovuContext } from '../../store/novu-provider.context';
import { ColorScheme } from '../../index';

interface INovuProviderProps {
  children: JSX.Element | Element;
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier: string;
  colorScheme?: ColorScheme;
}

export function NovuProvider(props: INovuProviderProps) {
  return (
    <NovuContext.Provider
      value={{
        backendUrl: props.backendUrl,
        subscriberId: props.subscriberId,
        applicationIdentifier: props.applicationIdentifier,
        colorScheme: props.colorScheme || 'light',
      }}>
      {props.children}
    </NovuContext.Provider>
  );
}
