import { useQuery } from '@tanstack/react-query';
import type { IEnvironment } from '@novu/shared';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironmentContext } from './environment-context';
import { getCurrentEnvironment, getEnvironments } from '@/api/environments';

export function useEnvironment({ bridge }: { bridge?: boolean } = {}) {
  const { readOnly, ...rest } = useEnvironmentContext();

  return {
    ...rest,
    readOnly: readOnly || bridge || false,
    bridge: bridge || false,
  };
}

export const useFetchEnvironments = ({
  organizationId,
  onSuccess,
}: {
  organizationId?: string;
  onSuccess?: (args: IEnvironment[]) => void;
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
  } = useQuery<IEnvironment[]>([QueryKeys.myEnvironments, organizationId], getEnvironments, {
    enabled: !!organizationId,
    retry: false,
    staleTime: Infinity,
    onSuccess,
  });

  return {
    environments,
    areEnvironmentsInitialLoading,
    refetchEnvironments,
  };
};

export const useFetchCurrentEnvironment = ({
  organizationId,
  onSuccess,
}: {
  organizationId?: string;
  onSuccess?: (args: IEnvironment) => void;
}) => {
  const { data: currentEnvironment, isInitialLoading: isCurrentEnvironmentInitialLoading } = useQuery<IEnvironment>(
    [QueryKeys.currentEnvironment, organizationId],
    getCurrentEnvironment,
    {
      enabled: !!organizationId,
      retry: false,
      staleTime: Infinity,
      onSuccess,
    }
  );

  return {
    currentEnvironment,
    isCurrentEnvironmentInitialLoading,
  };
};
