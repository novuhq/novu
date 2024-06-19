import { useCallback, useState } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { IEnvironment } from '@novu/shared';

import { getCurrentEnvironment, getMyEnvironments } from '../api/environment';

import { useAuth } from './useAuth';
import { QueryKeys } from '../api/query.keys';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { api } from '../api/index';
import { IS_DOCKER_HOSTED } from '../config/index';
import { BaseEnvironmentEnum } from '../constants/BaseEnvironmentEnum';

interface ISetEnvironmentOptions {
  /** using null will prevent a reroute */
  route?: ROUTES | string | null;
}

export type EnvironmentName = BaseEnvironmentEnum | IEnvironment['name'];

export const useEnvironment = (options: UseQueryOptions<IEnvironment, any, IEnvironment> = {}, bridge = false) => {
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { data: environments, isLoading: isLoadingMyEnvironments } = useQuery<IEnvironment[]>(
    [QueryKeys.myEnvironments],
    getMyEnvironments,
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  const {
    data: environment,
    isLoading: isLoadingCurrentEnvironment,
    refetch: refetchEnvironment,
  } = useQuery<IEnvironment>([QueryKeys.currentEnvironment], getCurrentEnvironment, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    ...options,
  });
  const isAllLoading = isLoading || isLoadingMyEnvironments || isLoadingCurrentEnvironment;

  const setEnvironmentCallback = useCallback(
    async (environmentName: string, { route }: ISetEnvironmentOptions = { route: ROUTES.HOME }) => {
      if (isAllLoading) {
        return;
      }

      const targetEnvironment = environments?.find((_environment) => _environment.name === environmentName);
      if (!targetEnvironment) {
        return;
      }

      setIsLoading(true);
      // TODO: Do we need to get the token from this endpoint?
      const tokenResponse = await api.post(`/v1/auth/environments/${targetEnvironment?._id}/switch`, {});
      setIsLoading(false);
      if (!tokenResponse.token) {
        return;
      }
      await login(tokenResponse.token);

      await queryClient.invalidateQueries();
      if (route) {
        await navigate(route);
      }
    },
    [isAllLoading, environments, navigate, queryClient, login]
  );

  return {
    environments,
    refetchEnvironment,
    environment,
    readonly: environment?._parentId !== undefined || (!IS_DOCKER_HOSTED && bridge),
    // @deprecated
    chimera: !IS_DOCKER_HOSTED && bridge,
    bridge: !IS_DOCKER_HOSTED && bridge,
    setEnvironment: setEnvironmentCallback,
    isLoading: isLoadingMyEnvironments || isLoadingCurrentEnvironment || isLoading,
  };
};
