import type { IEnvironment } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { getEnvironments } from '@/api/environments';
import { createContextHook } from '@/utils/context';
import { QueryKeys } from '@/utils/query-keys';
import { EnvironmentContext } from './environment-context';

const useEnvironmentContext = createContextHook(EnvironmentContext);

export function requireEnvironment<T>(environment: T, message: string): NonNullable<T> {
  if (!environment) {
    throw new Error(message);
  }

  return environment as NonNullable<T>;
}

export function useEnvironment() {
  const { readOnly, ...rest } = useEnvironmentContext();

  return {
    ...rest,
    readOnly: readOnly || false,
  };
}

export const useFetchEnvironments = ({
  organizationId,
  refetchInterval,
  showError = true,
}: {
  organizationId?: string;
  refetchInterval?: number;
  showError?: boolean;
}) => {
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
    refetchInterval,
    meta: {
      showError,
    },
  });

  return {
    environments,
    areEnvironmentsInitialLoading,
    refetchEnvironments,
  };
};
