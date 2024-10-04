import { useCallback, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import type { IEnvironment } from '@novu/shared';
import { useFetchEnvironments } from './hooks';
import { useAuth } from '../auth';
import { EnvironmentContext } from './environment-context';
import { getEnvironmentId, saveEnvironmentId } from '@/utils/environment';
import { BaseEnvironmentEnum } from '@/utils/types';

function selectEnvironment(environments?: IEnvironment[], selectedEnvironmentId?: string | null) {
  if (!environments) {
    return null;
  }

  let environment: IEnvironment | undefined;

  // Find the environment based on the current user's last environment
  if (selectedEnvironmentId) {
    environment = environments.find((env) => env._id === selectedEnvironmentId);
  }

  // Or pick the development environment
  if (!environment) {
    environment = environments.find((env) => env.name === BaseEnvironmentEnum.DEVELOPMENT);
  }

  if (!environment) {
    throw new Error('Missing development environment');
  }

  saveEnvironmentId(environment._id);

  return environment;
}

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useAuth();
  const [currentEnvironment, setCurrentEnvironment] = useState<IEnvironment | null>(null);

  const { environments, areEnvironmentsInitialLoading } = useFetchEnvironments({
    organizationId: currentOrganization?._id,
    onSuccess: (environments) => {
      flushSync(() => setCurrentEnvironment(selectEnvironment(environments, getEnvironmentId())));
    },
  });

  const switchEnvironment = useCallback(() => {
    // TODO: in the next PR
  }, []);

  const value = useMemo(
    () => ({
      currentEnvironment,
      environments,
      areEnvironmentsInitialLoading,
      readOnly: currentEnvironment?._parentId !== undefined,
      switchEnvironment,
    }),
    [currentEnvironment, environments, areEnvironmentsInitialLoading, switchEnvironment]
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}
