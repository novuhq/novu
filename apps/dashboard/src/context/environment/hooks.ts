import { useQuery } from '@tanstack/react-query';
import type { IEnvironment } from '@novu/shared';
import { QueryKeys } from '@/utils/query-keys';
import { EnvironmentContext } from './environment-context';
import { getEnvironments } from '@/api/environments';
import { createContextHook } from '@/utils/context';

const useEnvironmentContext = createContextHook(EnvironmentContext);

export function useEnvironment() {
  const { readOnly, ...rest } = useEnvironmentContext();

  return {
    ...rest,
    readOnly: readOnly || false,
  };
}

export const useFetchEnvironments = ({ organizationId }: { organizationId?: string }) => {
  /*
   * Loading environments depends on the current organization. Fetching should start only when the current
   * organization is set and it should happens once, on full page reload, until the cache is invalidated on-demand
   * or a refetch is triggered manually.
   */
  const {
    data: environments,
    isInitialLoading: areEnvironmentsInitialLoading,
    refetch: refetchEnvironments,
  } = useQuery<IEnvironment[]>({
    queryKey: [QueryKeys.myEnvironments, organizationId],
    queryFn: getEnvironments,
    enabled: !!organizationId,
    retry: false,
    staleTime: Infinity,
  });

  return {
    environments,
    areEnvironmentsInitialLoading,
    refetchEnvironments,
  };
};
