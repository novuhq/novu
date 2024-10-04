import type { IEnvironment } from '@novu/shared';
import { createContextAndHook } from '@/utils/context';

export type EnvironmentContextValue = {
  currentEnvironment?: IEnvironment | null;
  environments?: IEnvironment[];
  isLoaded: boolean;
  readOnly: boolean;
};

const [EnvironmentContext, useEnvironmentContext] =
  createContextAndHook<EnvironmentContextValue>('Environment Context');

export { EnvironmentContext, useEnvironmentContext };
