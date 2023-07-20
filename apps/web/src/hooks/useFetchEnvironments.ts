import { IEnvironment } from '@novu/shared';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { getMyEnvironments } from '../api/environment';
import { QueryKeys } from '../api/query.keys';

export const useFetchEnvironments = (options: UseQueryOptions<IEnvironment[], any, IEnvironment[]> = {}) => {
  const { data: environments, ...rest } = useQuery<IEnvironment[]>([QueryKeys.myEnvironments], getMyEnvironments, {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });

  return {
    environments,
    ...rest,
  };
};
