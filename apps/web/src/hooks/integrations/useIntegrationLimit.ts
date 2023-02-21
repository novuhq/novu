import { useQuery } from '@tanstack/react-query';
import { ChannelTypeEnum } from '@novu/shared';
import { getIntegrationLimit } from '../../api/integration';
import { useMemo } from 'react';
import { IS_DOCKER_HOSTED } from '../../config/index';
import { useActiveIntegrations } from './useActiveIntegrations';

export function useIntegrationLimit(type: ChannelTypeEnum) {
  const { integrations = [] } = useActiveIntegrations();

  const enabled = useMemo<boolean>(() => {
    return !IS_DOCKER_HOSTED && integrations.filter((integration) => integration.channel === type).length === 0;
  }, [integrations, type, IS_DOCKER_HOSTED]);

  const {
    data = { limit: 0, count: 0 },
    isLoading,
    refetch,
  } = useQuery(['integrationLimit', type], () => getIntegrationLimit(type), {
    enabled,
    refetchInterval: 10000,
  });

  return {
    limit: data,
    loading: isLoading,
    refetch,
    enabled,
  };
}
