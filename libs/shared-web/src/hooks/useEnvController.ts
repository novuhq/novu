import { useCallback, useState } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { IEnvironment } from '@novu/shared';

import { getCurrentEnvironment, getMyEnvironments } from '../api/environment';

import { useAuthContext } from '../providers/AuthProvider';
import { QueryKeys } from '../api/query.keys';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes.enum';
import { api } from '../api';

export type EnvironmentContext = {
  readonly: boolean;
  isLoading: boolean;
  environment: IEnvironment | undefined;
  setEnvironment: (environment: string) => void;
  refetchEnvironment: () => void;
};

export const useEnvController = (
  options: UseQueryOptions<IEnvironment, any, IEnvironment> = {}
): EnvironmentContext => {
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { setToken } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const { data: environments, isLoading: isLoadingMyEnvironments } = useQuery<IEnvironment[]>(
    [QueryKeys.myEnvironments],
    getMyEnvironments
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
    async (environmentName: string) => {
      if (isAllLoading) {
        return;
      }

      const targetEnvironment = environments?.find((_environment) => _environment.name === environmentName);
      if (!targetEnvironment) {
        return;
      }

      setIsLoading(true);
      const tokenResponse = await api.post(`/v1/auth/environments/${targetEnvironment?._id}/switch`, {});
      setIsLoading(false);
      if (!tokenResponse.token) {
        return;
      }
      setToken(tokenResponse.token);

      await navigate(ROUTES.HOME);
      await queryClient.invalidateQueries();
    },
    [isAllLoading, environments, navigate, queryClient, setToken]
  );

  return {
    refetchEnvironment,
    environment,
    readonly: environment?._parentId !== undefined,
    setEnvironment: setEnvironmentCallback,
    isLoading: isLoadingMyEnvironments || isLoadingCurrentEnvironment || isLoading,
  };
};
