import { useQuery, useQueryClient } from 'react-query';
import { IEnvironment } from '@novu/shared';
import { useContext, useEffect, useState } from 'react';
import { getCurrentEnvironment, getMyEnvironments } from '../api/environment';
import { api } from '../api/api.client';
import { QueryKeys } from '../api/query.keys';
import { AuthContext } from './authContext';

export type EnvironmentContext = {
  readonly: boolean;
  isLoading: boolean;
  environment: IEnvironment | undefined;
  setEnvironment: (environment: string) => void;
  refetchEnvironment: () => void;
};

export const useEnvController = (): EnvironmentContext => {
  const queryClient = useQueryClient();
  const { setToken } = useContext(AuthContext);
  const [readonly, setReadonly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: environments, isLoading: isLoadingMyEnvironments } = useQuery<IEnvironment[]>(
    QueryKeys.myEnvironments,
    getMyEnvironments
  );
  const {
    data: environment,
    isLoading: isLoadingCurrentEnvironment,
    refetch: refetchEnvironment,
  } = useQuery<IEnvironment>(QueryKeys.currentEnvironment, getCurrentEnvironment);

  useEffect(() => {
    if (!environment) {
      return;
    }
    setReadonly(environment?._parentId !== undefined);
  }, [environment]);

  async function setEnvironment(environmentName: string) {
    if (isLoading || isLoadingMyEnvironments || isLoadingCurrentEnvironment) {
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

    await queryClient.refetchQueries();
  }

  return {
    refetchEnvironment,
    environment,
    readonly,
    setEnvironment,
    isLoading: isLoadingMyEnvironments || isLoadingCurrentEnvironment || isLoading,
  };
};
