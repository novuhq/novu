import type { IEnvironment } from '@novu/shared';
import { createContextAndHook } from '@/utils/context';

export type EnvironmentContextValue = {
  currentEnvironment?: IEnvironment | null;
  environments?: IEnvironment[];
  areEnvironmentsInitialLoading: boolean;
  readOnly: boolean;
  switchEnvironment: (newEnvironment?: string) => void;
};

const [EnvironmentContext, useEnvironmentContext] =
  createContextAndHook<EnvironmentContextValue>('Environment Context');

export { EnvironmentContext, useEnvironmentContext };
