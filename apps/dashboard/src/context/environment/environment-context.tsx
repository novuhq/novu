import type { IEnvironment } from '@novu/shared';
import React from 'react';

export type EnvironmentContextValue = {
  currentEnvironment?: IEnvironment;
  environments?: IEnvironment[];
  areEnvironmentsInitialLoading: boolean;
  readOnly: boolean;
  switchEnvironment: (newEnvironmentSlug?: string) => void;
  setBridgeUrl: (url: string) => void;
  oppositeEnvironment: IEnvironment | null;
};

export const EnvironmentContext = React.createContext<EnvironmentContextValue>({} as EnvironmentContextValue);
EnvironmentContext.displayName = 'EnvironmentContext';
