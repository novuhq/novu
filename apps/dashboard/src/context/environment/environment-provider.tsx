import { type IEnvironment } from '@novu/shared';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/auth/hooks';
import { EnvironmentContext } from '@/context/environment/environment-context';
import { useFetchEnvironments } from '@/context/environment/hooks';
import { loadFromStorage, saveToStorage } from '@/utils/local-storage';
import { buildRoute, ROUTES } from '@/utils/routes';

const PRODUCTION_ENVIRONMENT = 'Production';
const DEVELOPMENT_ENVIRONMENT = 'Development';
const LAST_SELECTED_ENVIRONMENT_STORAGE_KEY = 'novu-last-selected-environment';

function selectEnvironment(
  environments: IEnvironment[],
  selectedEnvironmentSlug?: string | null,
  organizationId?: string
) {
  let environment: IEnvironment | undefined;

  // Find the environment based on the current user's last environment
  // Support both slug and _id
  if (selectedEnvironmentSlug) {
    environment = environments.find(
      (env) => env.slug === selectedEnvironmentSlug || env._id === selectedEnvironmentSlug
    );
  }

  // If no environment slug in URL, try to load the last selected environment from storage
  if (!environment && organizationId) {
    const lastSelectedSlug = loadFromStorage<string>(
      `${LAST_SELECTED_ENVIRONMENT_STORAGE_KEY}-${organizationId}`,
      'environmentSlug'
    );
    if (lastSelectedSlug) {
      environment = environments.find((env) => env.slug === lastSelectedSlug);
    }
  }

  // Or pick the development environment as fallback
  if (!environment) {
    environment = environments.find((env) => env.name === DEVELOPMENT_ENVIRONMENT);
  }

  if (!environment) {
    throw new Error('Missing development environment');
  }

  return environment;
}

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const authResp = useAuth();
  const currentOrganization = authResp.currentOrganization;
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search, hash } = location;
  const { environmentSlug: paramsEnvironmentSlug } = useParams<{ environmentSlug?: string }>();
  const [currentEnvironment, setCurrentEnvironment] = useState<IEnvironment>();

  const switchEnvironmentInternal = useCallback(
    (allEnvironments: IEnvironment[], environmentSlug?: string | null) => {
      const selectedEnvironment = selectEnvironment(allEnvironments, environmentSlug, currentOrganization?._id);
      setCurrentEnvironment(selectedEnvironment);
      const newEnvironmentSlug = selectedEnvironment.slug;
      const isNewEnvironmentDifferent =
        paramsEnvironmentSlug !== selectedEnvironment.slug && paramsEnvironmentSlug !== selectedEnvironment._id;

      // Save the selected environment to localStorage for persistence
      if (currentOrganization?._id && newEnvironmentSlug) {
        saveToStorage(
          `${LAST_SELECTED_ENVIRONMENT_STORAGE_KEY}-${currentOrganization._id}`,
          newEnvironmentSlug,
          'environmentSlug'
        );
      }

      if (pathname === ROUTES.ROOT || pathname === ROUTES.ENV || pathname === `${ROUTES.ENV}/`) {
        navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: newEnvironmentSlug ?? '' }));
      } else if (pathname.includes(ROUTES.ENV) && isNewEnvironmentDifferent) {
        const newPath = pathname.replace(/\/env\/[^/]+(\/|$)/, `${ROUTES.ENV}/${newEnvironmentSlug}$1`);
        navigate(`${newPath}${search}${hash}`);
      }
    },
    [navigate, pathname, search, hash, paramsEnvironmentSlug, currentOrganization?._id]
  );

  const { environments, areEnvironmentsInitialLoading } = useFetchEnvironments({
    organizationId: currentOrganization?._id,
    showError: false,
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
