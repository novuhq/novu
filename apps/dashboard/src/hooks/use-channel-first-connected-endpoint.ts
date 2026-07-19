import { ENDPOINT_TYPES, type IEnvironment } from '@novu/shared';
import { type Query, useQuery } from '@tanstack/react-query';
import {
  type ChannelEndpointDto,
  type ChannelEndpointsListResponse,
  listChannelEndpoints,
} from '@/api/channel-endpoints';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';

const POLL_INTERVAL_MS = 3000;

/**
 * Endpoint types created when an end user links their own account through the embedded
 * connect button (e.g. `<SlackConnectButton />`, `<TelegramConnectButton />`). For OAuth
 * providers (Slack/Teams) bot-DM auto-provision creates the same endpoint types without a
 * `connectionIdentifier`, so the presence of one is what separates a deliberate connect from
 * someone merely messaging the bot.
 */
const CONNECT_FLOW_USER_ENDPOINT_TYPES = new Set<string>([
  ENDPOINT_TYPES.SLACK_USER,
  ENDPOINT_TYPES.MS_TEAMS_USER,
  ENDPOINT_TYPES.TELEGRAM_CHAT,
]);

/**
 * Deep-link providers (Telegram) never carry a `connectionIdentifier`, and a bare bot DM does not
 * auto-provision an endpoint — only the `/start <code>` deep-link connect flow does. So for these
 * types we rely solely on excluding the dashboard user's own subscriber id to filter out setup
 * tests, rather than requiring a `connectionIdentifier`.
 */
const ENDPOINT_TYPES_WITHOUT_CONNECTION_IDENTIFIER = new Set<string>([ENDPOINT_TYPES.TELEGRAM_CHAT]);

type UseChannelFirstConnectedEndpointParams = {
  /** Public identifier of the integration whose first connected end user we wait for. */
  integrationIdentifier: string;
  enabled?: boolean;
};

type ChannelFirstConnectedEndpointQueryParams = {
  environment: IEnvironment | undefined;
  integrationIdentifier: string;
  dashboardSubscriberId: string;
  enabled?: boolean;
};

/**
 * A genuine end-user connection is a user-type channel endpoint that:
 *  - is a connect-flow endpoint type, and
 *  - for OAuth providers, came from the connect flow (`connectionIdentifier` is set, not a bot-DM
 *    auto-provision) — deep-link providers like Telegram are exempt from this check, and
 *  - is not the currently logged-in dashboard user's own subscriber (onboarding self-test).
 */
export function isGenuineConnectedEndpoint(
  endpoint: ChannelEndpointDto,
  dashboardSubscriberId: string
): boolean {
  if (!CONNECT_FLOW_USER_ENDPOINT_TYPES.has(endpoint.type)) {
    return false;
  }

  const requiresConnectionIdentifier = !ENDPOINT_TYPES_WITHOUT_CONNECTION_IDENTIFIER.has(endpoint.type);
  if (requiresConnectionIdentifier && !endpoint.connectionIdentifier) {
    return false;
  }

  return endpoint.subscriberId !== dashboardSubscriberId;
}

/** The earliest (first) genuine end-user connection, or null if none exists yet. */
export function findFirstGenuineConnectedEndpoint(
  data: ChannelEndpointsListResponse | undefined,
  dashboardSubscriberId: string
): ChannelEndpointDto | null {
  if (!data) {
    return null;
  }

  const genuine = data.data.filter((endpoint) => isGenuineConnectedEndpoint(endpoint, dashboardSubscriberId));
  if (genuine.length === 0) {
    return null;
  }

  return genuine.reduce((earliest, endpoint) =>
    new Date(endpoint.createdAt).getTime() < new Date(earliest.createdAt).getTime() ? endpoint : earliest
  );
}

/** Shared TanStack Query options for first genuine end-user channel endpoint polling. */
export function channelFirstConnectedEndpointQueryOptions({
  environment,
  integrationIdentifier,
  dashboardSubscriberId,
  enabled = true,
}: ChannelFirstConnectedEndpointQueryParams) {
  return {
    queryKey: [
      'agent-channel-first-connected-endpoint',
      environment?._id,
      integrationIdentifier,
      dashboardSubscriberId,
    ],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      listChannelEndpoints({
        // biome-ignore lint/style/noNonNullAssertion: guarded by `enabled` below
        environment: environment!,
        integrationIdentifier,
        signal,
      }),
    enabled: enabled && Boolean(environment) && Boolean(dashboardSubscriberId),
    refetchOnWindowFocus: false,
    refetchInterval: (query: Query<ChannelEndpointsListResponse>) =>
      findFirstGenuineConnectedEndpoint(query.state.data, dashboardSubscriberId) ? false : POLL_INTERVAL_MS,
  };
}

/**
 * Polls the channel-endpoints API for the first genuine end-user connection created through the
 * embedded SDK connect button for a specific integration. Returns `connected: true` and the
 * connection's `connectedAt` (the endpoint's server `createdAt`) once one appears. Excludes bot-DM
 * auto-provisioned links and the dashboard user's own onboarding connect. Callers should disable this
 * where conversations are unavailable (e.g. self-hosted community).
 */
export function useChannelFirstConnectedEndpoint({
  integrationIdentifier,
  enabled = true,
}: UseChannelFirstConnectedEndpointParams) {
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const dashboardSubscriberId = currentUser?._id ?? '';

  const query = useQuery<ChannelEndpointsListResponse>(
    channelFirstConnectedEndpointQueryOptions({
      environment: currentEnvironment,
      integrationIdentifier,
      dashboardSubscriberId,
      enabled,
    })
  );

  const firstConnected = dashboardSubscriberId
    ? findFirstGenuineConnectedEndpoint(query.data, dashboardSubscriberId)
    : null;

  return {
    connected: firstConnected !== null,
    connectedAt: firstConnected?.createdAt ?? null,
    isLoading: query.isLoading,
  };
}
