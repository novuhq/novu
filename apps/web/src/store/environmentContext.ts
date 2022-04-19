import React from 'react';
import { IEnvironment } from '@novu/shared';

export type EnvironmentContext = {
  readonly: boolean;
  currentEnvironment: IEnvironment | undefined;
  setEnvironment: (environment: string) => void;
};

export const EnvContext = React.createContext<EnvironmentContext>({
  readonly: false,
  currentEnvironment: undefined,
  setEnvironment: () => null,
});
