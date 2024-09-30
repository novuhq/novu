import { useMemo } from 'react';
import { useFetchCurrentEnvironment, useFetchEnvironments } from './hooks';
import { useAuth } from '../auth';
import { EnvironmentContext } from './environment-context';
import { saveEnvironmentId } from '@/utils/local-storage';

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useAuth();

  const { environments, areEnvironmentsInitialLoading } = useFetchEnvironments({
    organizationId: currentOrganization?._id,
  });

  const { currentEnvironment } = useFetchCurrentEnvironment({
    organizationId: currentOrganization?._id,
    onSuccess: (env) => saveEnvironmentId(env._id),
  });

  const value = useMemo(
    () => ({
      currentEnvironment,
      environments,
      isLoaded: !areEnvironmentsInitialLoading,
      readOnly: currentEnvironment?._parentId !== undefined,
    }),
    [currentEnvironment, environments, areEnvironmentsInitialLoading]
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}
