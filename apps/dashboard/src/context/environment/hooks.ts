import { useQuery } from '@tanstack/react-query';
import type { IEnvironment } from '@novu/shared';
import { useNovuAPI } from '@/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironmentContext } from './environment-context';
import { IS_SELF_HOSTED } from '@/config';

export function useEnvironment({ bridge }: { bridge?: boolean } = {}) {
  const { readOnly, ...rest } = useEnvironmentContext();

  return {
    ...rest,
    readOnly: readOnly || (!IS_SELF_HOSTED && bridge) || false,
    bridge: (!IS_SELF_HOSTED && bridge) || false,
  };
}

export const useFetchEnvironments = ({
  organizationId,
  onSuccess,
}: {
  organizationId?: string;
  onSuccess?: (args: IEnvironment[]) => void;
}) => {
  const novuApi = useNovuAPI();

  /*
   * Loading environments depends on the current organization. Fetching should start only when the current
   * organization is set and it should happens once, on full page reload, until the cache is invalidated on-demand
   * or a refetch is triggered manually.
   */
  const {
    data: environments,
    isInitialLoading: areEnvironmentsInitialLoading,
    refetch: refetchEnvironments,
  } = useQuery<IEnvironment[]>([QueryKeys.myEnvironments, organizationId], novuApi.getEnvironments, {
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

export const useFetchCurrentEnvironment = ({ organizationId }: { organizationId?: string }) => {
  const novuApi = useNovuAPI();

  const { data: currentEnvironment, isInitialLoading: isCurrentEnvironmentInitialLoading } = useQuery<IEnvironment>(
    [QueryKeys.currentEnvironment, organizationId],
    novuApi.getCurrentEnvironment,
    {
      enabled: !!organizationId,
      retry: false,
      staleTime: Infinity,
    }
  );

  return {
    currentEnvironment,
    isCurrentEnvironmentInitialLoading,
  };
};
