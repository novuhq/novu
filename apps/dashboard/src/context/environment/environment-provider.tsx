import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { type IEnvironment } from '@novu/shared';

import { buildRoute, ROUTES } from '@/utils/routes';
import { useAuth } from '@/context/auth/hooks';
import { useFetchEnvironments } from '@/context/environment/hooks';
import { EnvironmentContext } from '@/context/environment/environment-context';

const PRODUCTION_ENVIRONMENT = 'Production';
const DEVELOPMENT_ENVIRONMENT = 'Development';

function selectEnvironment(environments: IEnvironment[], selectedEnvironmentSlug?: string | null) {
  let environment: IEnvironment | undefined;

  // Find the environment based on the current user's last environment
  if (selectedEnvironmentSlug) {
    environment = environments.find((env) => env.slug === selectedEnvironmentSlug);
  }

  // Or pick the development environment
  if (!environment) {
    environment = environments.find((env) => env.name === DEVELOPMENT_ENVIRONMENT);
  }

  if (!environment) {
    throw new Error('Missing development environment');
  }

  return environment;
}

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { environmentSlug: paramsEnvironmentSlug } = useParams<{ environmentSlug?: string }>();
  const [currentEnvironment, setCurrentEnvironment] = useState<IEnvironment>();

  const switchEnvironmentInternal = useCallback(
    (allEnvironments: IEnvironment[], environmentSlug?: string | null) => {
      const selectedEnvironment = selectEnvironment(allEnvironments, environmentSlug);
      setCurrentEnvironment(selectedEnvironment);
      const newEnvironmentSlug = selectedEnvironment.slug;
      const isNewEnvironmentDifferent = paramsEnvironmentSlug !== selectedEnvironment.slug;

      if (pathname === ROUTES.ROOT || pathname === ROUTES.ENV || pathname === `${ROUTES.ENV}/`) {
        // TODO: check if this ROUTES is correct
        navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: newEnvironmentSlug ?? '' }));
      } else if (pathname.includes(ROUTES.ENV) && isNewEnvironmentDifferent) {
        const newPath = pathname.replace(/\/env\/[^/]+(\/|$)/, `${ROUTES.ENV}/${newEnvironmentSlug}$1`);
        navigate(newPath);
      }
    },
    [navigate, pathname, paramsEnvironmentSlug]
  );

  const { environments, areEnvironmentsInitialLoading } = useFetchEnvironments({
    organizationId: currentOrganization?._id,
  });

  useLayoutEffect(() => {
    if (!environments) {
      return;
    }

    const environmentId = paramsEnvironmentSlug;
    switchEnvironmentInternal(environments, environmentId);
  }, [paramsEnvironmentSlug, environments, switchEnvironmentInternal]);

  const switchEnvironment = useCallback(
    (newEnvironmentSlug?: string) => {
      if (!environments) {
        return;
      }

      switchEnvironmentInternal(environments, newEnvironmentSlug);
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

  const oppositeEnvironment = useMemo((): IEnvironment | null => {
    if (!currentEnvironment || !environments) {
      return null;
    }

    const oppositeEnvironmentName =
      currentEnvironment.name === PRODUCTION_ENVIRONMENT ? DEVELOPMENT_ENVIRONMENT : PRODUCTION_ENVIRONMENT;

    return environments?.find((env) => env.name === oppositeEnvironmentName) || null;
  }, [currentEnvironment, environments]);

  const value = useMemo(
    () => ({
      currentEnvironment,
      environments,
      areEnvironmentsInitialLoading,
      readOnly: currentEnvironment?._parentId !== undefined,
      oppositeEnvironment,
      switchEnvironment,
      setBridgeUrl,
    }),
    [
      currentEnvironment,
      environments,
      areEnvironmentsInitialLoading,
      oppositeEnvironment,
      switchEnvironment,
      setBridgeUrl,
    ]
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}
