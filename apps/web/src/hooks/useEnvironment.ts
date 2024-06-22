import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { IEnvironment } from '@novu/shared';
import { getEnvironments } from '../api/environment';

import { QueryKeys } from '../api/query.keys';
import { useNavigate } from 'react-router-dom';
import { IS_DOCKER_HOSTED } from '../config/index';
import { BaseEnvironmentEnum } from '../constants/BaseEnvironmentEnum';

export type EnvironmentName = BaseEnvironmentEnum | IEnvironment['name'];

const LOCAL_STORAGE_LAST_ENVIRONMENT_ID = 'novu_last_environment_id';

function saveEnvironmentId(environmentId: string) {
  localStorage.setItem(LOCAL_STORAGE_LAST_ENVIRONMENT_ID, environmentId);
}

function getEnvironmentId(): string {
  return localStorage.getItem(LOCAL_STORAGE_LAST_ENVIRONMENT_ID) || '';
}

export const useEnvironment = (options: UseQueryOptions<IEnvironment, any, IEnvironment> = {}, bridge = false) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentEnvId, setCurrentEnvId] = useState<string>(getEnvironmentId());
  const {
    data: environments,
    isLoading,
    refetch: refetchEnvironments,
  } = useQuery<IEnvironment[]>([QueryKeys.myEnvironments], getEnvironments, {
    enabled: false,
    staleTime: Infinity,
  });

  const switchEnvironment = useCallback(
    async (environmentId: string, redirectUrl?: string) => {
      saveEnvironmentId(environmentId);
      setCurrentEnvId(environmentId);

      /*
       * TODO: Replace this revalidation by ensuring all query Keys in react-query contain the environmentId
       * This call creates an avalance of HTTP requests and also causes flakiness in the e2e suite.
       */
      await queryClient.invalidateQueries();

      if (redirectUrl) {
        await navigate(redirectUrl);
      }
    },
    [navigate, queryClient, setCurrentEnvId]
  );

  const switchToProductionEnvironment = useCallback(
    async (redirectUrl?: string) => {
      const envId = environments?.find((env) => env.name === BaseEnvironmentEnum.PRODUCTION)?._id;

      if (envId) {
        await switchEnvironment(envId, redirectUrl);
      } else {
        throw new Error('Production environment not found');
      }
    },
    [environments, switchEnvironment]
  );

  const switchToDevelopmentEnvironment = useCallback(
    async (redirectUrl?: string) => {
      const envId = environments?.find((env) => env.name === BaseEnvironmentEnum.DEVELOPMENT)?._id;

      if (envId) {
        await switchEnvironment(envId, redirectUrl);
      } else {
        throw new Error('Development environment not found');
      }
    },
    [environments, switchEnvironment]
  );

  const environment = useMemo(() => {
    let e: IEnvironment | undefined;

    if (!environments) {
      return e;
    }

    // Find the environment based on the current user's last environment
    e = environments.find((env) => env._id === currentEnvId);

    // Or pick the development environment
    if (!e) {
      e = environments.find((env) => env.name === BaseEnvironmentEnum.DEVELOPMENT);
    }

    return e;
  }, [environments, currentEnvId]);

  return {
    environment,
    environments,
    refetchEnvironments,
    switchEnvironment,
    switchToDevelopmentEnvironment,
    switchToProductionEnvironment,
    readonly: environment?._parentId !== undefined || (!IS_DOCKER_HOSTED && bridge),
    // @deprecated use bridge instead
    chimera: !IS_DOCKER_HOSTED && bridge,
    bridge: !IS_DOCKER_HOSTED && bridge,
    isLoading,
  };
};
