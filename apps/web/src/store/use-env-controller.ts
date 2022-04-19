import { useQuery, useQueryClient } from 'react-query';
import { IEnvironment } from '@novu/shared';
import { getCurrentEnvironment, getMyEnvironments } from '../api/environment';
import { useContext, useEffect, useState } from 'react';
import { api } from '../api/api.client';
import { AuthContext } from './authContext';

export function useEnvController() {
  const queryClient = useQueryClient();
  const { setToken, jwtPayload } = useContext(AuthContext);
  const [readonly, setReadonly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: environments, isLoading: isLoadingMyEnvironments } = useQuery<IEnvironment[]>(
    'myEnvironments',
    getMyEnvironments
  );
  const { data: environment, isLoading: isLoadingCurrentEnvironment } = useQuery<IEnvironment>(
    'currentEnvironment',
    getCurrentEnvironment
  );

  useEffect(() => {
    if (environment) {
      setReadonly(environment.name === 'Production');
    }
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
    setToken(tokenResponse.token);
    setIsLoading(false);

    await queryClient.refetchQueries();
  }

  return {
    environment,
    readonly,
    setEnvironment,
  };
}
