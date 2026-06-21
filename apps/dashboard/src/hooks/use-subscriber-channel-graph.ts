import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';
import { ChannelConnectionDto, listChannelConnections } from '@/api/channel-connections';
import { ChannelEndpointDto, listChannelEndpoints } from '@/api/channel-endpoints';

export type ChannelGraphGroup = {
  integrationIdentifier: string;
  connection: ChannelConnectionDto | null;
  endpoints: ChannelEndpointDto[];
};

function buildChannelGraph(
  connections: ChannelConnectionDto[],
  endpoints: ChannelEndpointDto[]
): ChannelGraphGroup[] {
  const groupMap = new Map<string, ChannelGraphGroup>();

  for (const conn of connections) {
    if (conn.integrationIdentifier) {
      groupMap.set(conn.integrationIdentifier, {
        integrationIdentifier: conn.integrationIdentifier,
        connection: conn,
        endpoints: [],
      });
    }
  }

  for (const ep of endpoints) {
    const key = ep.integrationIdentifier ?? ep.connectionIdentifier ?? ep.identifier;
    const existing = groupMap.get(key);
    if (existing) {
      existing.endpoints.push(ep);
    } else {
      groupMap.set(key, {
        integrationIdentifier: key,
        connection: null,
        endpoints: [ep],
      });
    }
  }

  return Array.from(groupMap.values());
}

export function useSubscriberChannelGraph(subscriberId: string) {
  const { currentEnvironment } = useEnvironment();

  const connectionsQuery = useQuery({
    queryKey: [QueryKeys.fetchChannelConnections, currentEnvironment?._id, { subscriberId }],
    queryFn: () => listChannelConnections({ subscriberId, limit: 100 }, currentEnvironment!),
    enabled: !!currentEnvironment?._id && !!subscriberId,
  });

  const endpointsQuery = useQuery({
    queryKey: [QueryKeys.fetchChannelEndpoints, currentEnvironment?._id, { subscriberId }],
    queryFn: () => listChannelEndpoints({ subscriberId, limit: 100 }, currentEnvironment!),
    enabled: !!currentEnvironment?._id && !!subscriberId,
  });

  const isPending = connectionsQuery.isPending || endpointsQuery.isPending;
  const isError = connectionsQuery.isError || endpointsQuery.isError;

  const channelGraph = !isPending && !isError
    ? buildChannelGraph(connectionsQuery.data?.data ?? [], endpointsQuery.data?.data ?? [])
    : [];

  return {
    channelGraph,
    isPending,
    isError,
    connections: connectionsQuery.data?.data ?? [],
    endpoints: endpointsQuery.data?.data ?? [],
  };
}
