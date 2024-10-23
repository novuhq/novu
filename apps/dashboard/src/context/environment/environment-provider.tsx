import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { IEnvironment } from '@novu/shared';
import { getEnvironmentId, saveEnvironmentId } from '@/utils/environment';
import { BaseEnvironmentEnum } from '@/utils/types';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useAuth } from '@/context/auth/hooks';
import { useFetchEnvironments } from '@/context/environment/hooks';
import { EnvironmentContext } from '@/context/environment/environment-context';

function selectEnvironment(environments: IEnvironment[], selectedEnvironmentId?: string | null) {
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
  const { environmentId: paramsEnvironmentId } = useParams<{ environmentId?: string }>();
  const [currentEnvironment, setCurrentEnvironment] = useState<IEnvironment>();

  const switchEnvironmentInternal = useCallback(
    (allEnvironments: IEnvironment[], environmentId?: string | null) => {
      const selectedEnvironment = selectEnvironment(allEnvironments, environmentId);
      setCurrentEnvironment(selectedEnvironment);
      const newEnvironmentId = selectedEnvironment._id;
      const isNewEnvironmentDifferent = paramsEnvironmentId !== selectedEnvironment._id;

      if (pathname === ROUTES.ROOT || pathname === ROUTES.ENV || pathname === `${ROUTES.ENV}/`) {
        navigate(buildRoute(ROUTES.WORKFLOWS, { environmentId: newEnvironmentId }));
      } else if (pathname.includes(ROUTES.ENV) && isNewEnvironmentDifferent) {
        const newPath = pathname.replace(/\/env\/[^/]+(\/|$)/, `${ROUTES.ENV}/${newEnvironmentId}$1`);
        navigate(newPath);
      }
    },
    [navigate, pathname, paramsEnvironmentId]
  );

  const { environments, areEnvironmentsInitialLoading } = useFetchEnvironments({
    organizationId: currentOrganization?._id,
  });

  useLayoutEffect(() => {
    if (!environments) {
      return;
    }

    const environmentId = paramsEnvironmentId ?? getEnvironmentId();
    switchEnvironmentInternal(environments, environmentId);
  }, [paramsEnvironmentId, environments, switchEnvironmentInternal]);

  const switchEnvironment = useCallback(
    (newEnvironmentId?: string) => {
      if (!environments) {
        return;
      }

      switchEnvironmentInternal(environments, newEnvironmentId);
    },
    [switchEnvironmentInternal, environments]
  );

  const setBridgeUrl = useCallback(
    (url: string) => {
      if (!currentEnvironment) {
        return;
      }

      setCurrentEnvironment({ ...currentEnvironment, bridge: { url } });
    },
    [currentEnvironment]
  );

  const value = useMemo(
    () => ({
      currentEnvironment,
      environments,
      areEnvironmentsInitialLoading,
      readOnly: currentEnvironment?._parentId !== undefined,
      switchEnvironment,
      setBridgeUrl,
    }),
    [currentEnvironment, environments, areEnvironmentsInitialLoading, switchEnvironment, setBridgeUrl]
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}
