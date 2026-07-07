import { useQuery } from '@tanstack/react-query';
import { type ChannelEndpointDto, listChannelEndpoints } from '@/api/channel-endpoints';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type UseFetchChannelEndpointsParams = {
  subscriberId: string;
  channel?: string;
  enabled?: boolean;
};

export function useFetchChannelEndpoints({ subscriberId, channel, enabled = true }: UseFetchChannelEndpointsParams) {
  const { currentEnvironment } = useEnvironment();

  const { data, ...rest } = useQuery({
    queryKey: [QueryKeys.fetchChannelEndpoints, currentEnvironment?._id, subscriberId, channel],
    queryFn: ({ signal }) => listChannelEndpoints({ environment: currentEnvironment!, subscriberId, channel, signal }),
    enabled: !!currentEnvironment?._id && !!subscriberId && enabled,
  });

  const channelEndpoints: ChannelEndpointDto[] = data?.data ?? [];

  return {
    channelEndpoints,
    ...rest,
  };
}
