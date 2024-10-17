import React from 'react';
import type { IEnvironment } from '@novu/shared';

export type EnvironmentContextValue = {
  currentEnvironment?: IEnvironment;
  environments?: IEnvironment[];
  areEnvironmentsInitialLoading: boolean;
  readOnly: boolean;
  switchEnvironment: (newEnvironment?: string) => void;
  setBridgeUrl: (url: string) => void;
};

export const EnvironmentContext = React.createContext<EnvironmentContextValue>({} as EnvironmentContextValue);
EnvironmentContext.displayName = 'EnvironmentContext';
