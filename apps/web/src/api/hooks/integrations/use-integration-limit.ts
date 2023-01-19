import { useQuery } from '@tanstack/react-query';
import { ChannelTypeEnum } from '@novu/shared';
import { getIntegrationLimit } from '../../integration';
import { useActiveIntegrations } from '.';

export function useIntegrationLimit(type: ChannelTypeEnum) {
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';
  const { integrations = [] } = useActiveIntegrations();

  const {
    data = { limit: 0, count: 0 },
    isLoading,
    refetch,
  } = useQuery(['integrationLimit', type], () => getIntegrationLimit(type), {
    enabled: selfHosted && integrations.filter((integration) => integration.channel === type).length === 0,
    refetchInterval: 10000,
  });

  return {
    limit: data,
    loading: isLoading,
    refetch,
    enabled: selfHosted && integrations.filter((integration) => integration.channel === type).length === 0,
  };
}
