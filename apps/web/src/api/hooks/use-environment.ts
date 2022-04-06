import { useQuery } from 'react-query';
import { IEnvironment } from '@novu/shared';
import { getCurrentEnvironment } from '../environment';

export function useEnvironment() {
  const { data: environment, isLoading, refetch } = useQuery<IEnvironment>('currentEnvironment', getCurrentEnvironment);

  return {
    environment,
    loading: isLoading,
    refetch,
  };
}
