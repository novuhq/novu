import { useQuery } from '@tanstack/react-query';
import { type ChannelConnectionDto, listChannelConnections } from '@/api/channel-connections';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type UseFetchChannelConnectionsParams = {
  subscriberId?: string;
  channel?: string;
  enabled?: boolean;
};

export function useFetchChannelConnections({
  subscriberId,
  channel,
  enabled = true,
}: UseFetchChannelConnectionsParams = {}) {
  const { currentEnvironment } = useEnvironment();

  const { data, ...rest } = useQuery({
    queryKey: [QueryKeys.fetchChannelConnections, currentEnvironment?._id, subscriberId, channel],
    queryFn: ({ signal }) =>
      listChannelConnections({ environment: currentEnvironment!, subscriberId, channel, signal }),
    enabled: !!currentEnvironment?._id && enabled,
  });

  const channelConnections: ChannelConnectionDto[] = data?.data ?? [];

  return {
    channelConnections,
    ...rest,
  };
}
