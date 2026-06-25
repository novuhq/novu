import { CONNECT_SUBSCRIBER_PREFIX, ENDPOINT_TYPES } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { type ChannelEndpointsListResponse, listChannelEndpoints } from '@/api/channel-endpoints';
import { useEnvironment } from '@/context/environment/hooks';

const POLL_INTERVAL_MS = 3000;

/**
 * Endpoint types created when an end user links their own account through the embedded
 * connect button (e.g. `<SlackConnectButton />`). Bot-DM auto-provision creates the same
 * endpoint types but without a `connectionIdentifier`, so the presence of one is what
 * separates a deliberate connect from someone merely messaging the bot.
 */
const CONNECT_FLOW_USER_ENDPOINT_TYPES = new Set<string>([ENDPOINT_TYPES.SLACK_USER, ENDPOINT_TYPES.MS_TEAMS_USER]);

const CONNECT_SUBSCRIBER_ID_PREFIX = `${CONNECT_SUBSCRIBER_PREFIX}:`;

type UseChannelFirstConnectedEndpointParams = {
  /** Public identifier of the integration whose first connected end user we wait for. */
  integrationIdentifier: string;
  enabled?: boolean;
};

/**
 * A genuine end-user connection is a user-type channel endpoint that:
 *  - came from the OAuth connect flow (`connectionIdentifier` is set, not a bot-DM auto-provision), and
 *  - is not the Novu dashboard's own onboarding subscriber (`connect:` prefixed id).
 */
function hasGenuineConnectedEndpoint(data: ChannelEndpointsListResponse | undefined): boolean {
  if (!data) {
    return false;
  }

  return data.data.some(
    (endpoint) =>
      CONNECT_FLOW_USER_ENDPOINT_TYPES.has(endpoint.type) &&
      Boolean(endpoint.connectionIdentifier) &&
      !endpoint.subscriberId?.startsWith(CONNECT_SUBSCRIBER_ID_PREFIX)
  );
}

/**
 * Polls the channel-endpoints API for the first genuine end-user connection created through the
 * embedded SDK connect button for a specific integration. Returns `connected: true` once one
 * appears. Excludes bot-DM auto-provisioned links and the dashboard's own onboarding connect.
 * Callers should disable this where conversations are unavailable (e.g. self-hosted community).
 */
export function useChannelFirstConnectedEndpoint({
  integrationIdentifier,
  enabled = true,
}: UseChannelFirstConnectedEndpointParams) {
  const { currentEnvironment } = useEnvironment();

  const query = useQuery<ChannelEndpointsListResponse>({
    queryKey: ['agent-channel-first-connected-endpoint', currentEnvironment?._id, integrationIdentifier],
    queryFn: ({ signal }) =>
      listChannelEndpoints({
        // biome-ignore lint/style/noNonNullAssertion: guarded by `enabled` below
        environment: currentEnvironment!,
        integrationIdentifier,
        signal,
      }),
    enabled: enabled && Boolean(currentEnvironment),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (hasGenuineConnectedEndpoint(query.state.data) ? false : POLL_INTERVAL_MS),
  });

  return {
    connected: hasGenuineConnectedEndpoint(query.data),
    isLoading: query.isLoading,
  };
}
