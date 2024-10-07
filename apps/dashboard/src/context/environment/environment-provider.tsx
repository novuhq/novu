import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import type { IEnvironment } from '@novu/shared';
import { useFetchEnvironments } from './hooks';
import { useAuth } from '../auth';
import { EnvironmentContext } from './environment-context';
import { getEnvironmentId, saveEnvironmentId } from '@/utils/environment';
import { BaseEnvironmentEnum } from '@/utils/types';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildRoute, ROUTES } from '@/utils/routes';

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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [currentEnvironment, setCurrentEnvironment] = useState<IEnvironment | null>(null);

  const switchEnvironmentInternal = useCallback(
    (allEnvironments?: IEnvironment[], newEnvironmentId?: string) => {
      const selectedEnvironment = selectEnvironment(allEnvironments, newEnvironmentId);
      setCurrentEnvironment(selectedEnvironment);

      if (
        (pathname === ROUTES.ROOT || pathname === ROUTES.ENV || pathname === `${ROUTES.ENV}/`) &&
        selectedEnvironment
      ) {
        navigate(buildRoute(ROUTES.WORKFLOWS, { environmentId: selectedEnvironment._id }));
        return;
      } else if (pathname.includes(ROUTES.ENV) && selectedEnvironment) {
        const newPath = pathname.replace(/\/env\/[^/]+(\/|$)/, `${ROUTES.ENV}/${selectedEnvironment._id}$1`);
        navigate(newPath);
        return;
      }

      navigate(pathname, { replace: true });
    },
    [navigate, pathname]
  );

  const { environments, areEnvironmentsInitialLoading } = useFetchEnvironments({
    organizationId: currentOrganization?._id,
  });

  useLayoutEffect(() => {
    if (!environments) {
      return;
    }

    const selectedEnvironment = selectEnvironment(environments, getEnvironmentId());
    switchEnvironmentInternal(environments, selectedEnvironment?._id);
  }, [environments, switchEnvironmentInternal]);

  const switchEnvironment = useCallback(
    (newEnvironmentId?: string) => switchEnvironmentInternal(environments, newEnvironmentId),
    [switchEnvironmentInternal, environments]
  );

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
