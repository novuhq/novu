import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IEnvironment } from '@novu/shared';
import { QueryKeys } from '../../api/query.keys';
import { getEnvironments } from '../../api/environment';
import { createContextAndHook } from './createContextAndHook';
import { IS_SELF_HOSTED } from '../../config/index';
import { BaseEnvironmentEnum } from '../../constants/BaseEnvironmentEnum';
import { useAuth } from './AuthProvider';
import { ROUTES } from '../../constants/routes';

export type EnvironmentName = BaseEnvironmentEnum | IEnvironment['name'];

const LOCAL_STORAGE_LAST_ENVIRONMENT_ID = 'nv_last_environment_id';

export function saveEnvironmentId(environmentId: string) {
  localStorage.setItem(LOCAL_STORAGE_LAST_ENVIRONMENT_ID, environmentId);
}

export function getEnvironmentId() {
  return localStorage.getItem(LOCAL_STORAGE_LAST_ENVIRONMENT_ID) || '';
}

export function clearEnvironmentId() {
  return localStorage.removeItem(LOCAL_STORAGE_LAST_ENVIRONMENT_ID);
}

type EnvironmentContextValue = {
  currentEnvironment?: IEnvironment | null;
  // @deprecated use currentEnvironment instead;
  environment?: IEnvironment | null;
  environments?: IEnvironment[];
  refetchEnvironments: () => Promise<void>;
  switchEnvironment: (params: Partial<{ environmentId: string; redirectUrl: string }>) => Promise<void>;
  switchToDevelopmentEnvironment: (redirectUrl?: string) => Promise<void>;
  switchToProductionEnvironment: (redirectUrl?: string) => Promise<void>;
  isLoaded: boolean;
  readOnly: boolean;
};

const [EnvironmentCtx, useEnvironmentCtx] = createContextAndHook<EnvironmentContextValue>('Environment Context');

// TODO: Move this logic to the server and use the environments /me endpoint instead
function selectEnvironment(environments: IEnvironment[] | undefined | null, selectedEnvironmentId?: string) {
  let e: IEnvironment | undefined | null = null;

  if (!environments) {
    return null;
  }

  // Find the environment based on the current user's last environment
  if (selectedEnvironmentId) {
    e = environments.find((env) => env._id === selectedEnvironmentId);
  }

  // Or pick the development environment
  if (!e) {
    e = environments.find((env) => env.name === BaseEnvironmentEnum.DEVELOPMENT);
  }

  if (!e) {
    throw new Error('Missing development environment');
  }

  saveEnvironmentId(e._id);

  return e;
}

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  // Start with a null environment
  const [currentEnvironment, setCurrentEnvironment] = useState<IEnvironment | null>(null);

  /*
   * Loading environments depends on the current organization. Fetching should start only when the current
   * organization is set and it should happens once, on full page reload, until the cache is invalidated on-demand
   * or a refetch is triggered manually.
   */
  const {
    data: environments,
    isInitialLoading,
    refetch: refetchEnvironments,
  } = useQuery<IEnvironment[]>([QueryKeys.myEnvironments, currentOrganization?._id], getEnvironments, {
    enabled: !!currentOrganization,
    retry: false,
    staleTime: Infinity,
    onSuccess(envs) {
      /*
       * This is a required hack to ensure that fetching environments, isLoading = false and currentEnvironment
       * are all set as part of the same rendering cycle.
       */
      flushSync(() => setCurrentEnvironment(selectEnvironment(envs, getEnvironmentId())));
    },
  });

  const switchEnvironment = useCallback(
    async ({ environmentId, redirectUrl }: Partial<{ environmentId: string; redirectUrl: string }> = {}) => {
      /**
       * This is for handling the case when the environment is the same, but was updated on the database and re-fetched.
       * So we want to call this all the time.
       */
      setCurrentEnvironment(selectEnvironment(environments, environmentId));

      if (currentEnvironment?._id === environmentId) {
        return;
      }

      /*
       * TODO: Replace this revalidation by moving environment ID or name to the URL.
       */
      await queryClient.invalidateQueries();

      if (redirectUrl) {
        navigate(redirectUrl);
      }

      // if we are in a specific workflow detail when switching the env, redirect to workflows
      if (window.location.pathname.includes('workflows/edit')) {
        navigate(ROUTES.WORKFLOWS);
      }
    },
    [queryClient, navigate, setCurrentEnvironment, currentEnvironment, environments]
  );

  const switchToProductionEnvironment = useCallback(
    async (redirectUrl?: string) => {
      const environmentId = environments?.find((env) => env.name === BaseEnvironmentEnum.PRODUCTION)?._id;

      if (environmentId) {
        await switchEnvironment({
          environmentId,
          redirectUrl,
        });
      } else {
        throw new Error('Production environment not found');
      }
    },
    [environments, switchEnvironment]
  );

  const switchToDevelopmentEnvironment = useCallback(
    async (redirectUrl?: string) => {
      const environmentId = environments?.find((env) => env.name === BaseEnvironmentEnum.DEVELOPMENT)?._id;

      if (environmentId) {
        await switchEnvironment({
          environmentId,
          redirectUrl,
        });
      } else {
        throw new Error('Development environment not found');
      }
    },
    [environments, switchEnvironment]
  );

  const reloadEnvironments = async () => {
    await refetchEnvironments();

    /**
     * TODO: remove this once the race condition after calling API
     * request right after login() on same path is resolved
     */
    const envs = await getEnvironments();
    selectEnvironment(envs);
  };

  /*
   * This effect ensures that switching takes place every time environments change. The most common usecase
   * is switching to a new organization
   */
  useEffect(() => {
    if (environments) {
      switchEnvironment({ environmentId: getEnvironmentId() });
    }
  }, [currentEnvironment, environments, switchEnvironment]);

  const value = {
    currentEnvironment,
    environment: currentEnvironment,
    environments,
    refetchEnvironments: reloadEnvironments,
    switchEnvironment,
    switchToDevelopmentEnvironment,
    switchToProductionEnvironment,
    isLoaded: !isInitialLoading,
    readOnly: currentEnvironment?._parentId !== undefined,
  };

  return <EnvironmentCtx.Provider value={{ value }}>{children}</EnvironmentCtx.Provider>;
}

export function useEnvironment({ bridge }: { bridge?: boolean } = {}) {
  const { readOnly, ...rest } = useEnvironmentCtx();

  return {
    ...rest,
    readOnly: readOnly || (!IS_SELF_HOSTED && bridge) || false,
    // @deprecated use readOnly instead
    readonly: readOnly || (!IS_SELF_HOSTED && bridge) || false,
    bridge: (!IS_SELF_HOSTED && bridge) || false,
  };
}
