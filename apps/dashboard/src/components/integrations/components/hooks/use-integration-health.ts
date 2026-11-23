import {
  ChannelTypeEnum,
  type IEnvironment,
  type IIntegration,
  IntegrationConnectionStatusEnum,
  IntegrationHealthErrorCodeEnum,
  type ITestIntegrationConnectionResponse,
  providers,
} from '@novu/shared';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { testIntegrationConnection } from '@/api/integrations';
import { QueryKeys } from '@/utils/query-keys';
import { formatHealthDate, isIntegrationFailing } from '../../utils/integration-health';
import { isDemoIntegration } from '../utils/helpers';

/** How an integration is doing: its stored health (from sends and checks) and the last "Verify integration" result. */
export type IntegrationHealth = {
  tone: 'success' | 'error' | 'warning' | 'neutral';
  /** Short status, e.g. "Connected" or "Verification failed". */
  label: string;
  /** What the provider said, when the check didn't pass. */
  message?: string;
  /** True when the credentials were rejected, so saving new ones is a reconnect. */
  needsReconnect: boolean;
};

export function getIntegrationHealthQueryKey(integrationId: string) {
  return ['integration-health', integrationId];
}

/** Inbox has no provider credentials, and Novu owns the demo providers' credentials, so neither can be verified. */
export function canVerifyIntegration(integration: IIntegration) {
  return integration.channel !== ChannelTypeEnum.IN_APP && !isDemoIntegration(integration.providerId);
}

function toHealth(
  integration: IIntegration,
  result: ITestIntegrationConnectionResponse | undefined,
  isChecking: boolean,
  /** When `result` was fetched, in ms. */
  checkedAt: number
): IntegrationHealth {
  if (!integration.active) return { tone: 'neutral', label: 'Paused', needsReconnect: false };
  if (isChecking) return { tone: 'neutral', label: 'Verifying…', needsReconnect: false };
  if (isIntegrationFailing(integration) && !isNewerValidCheck(integration, result, checkedAt)) {
    return getStoredErrorHealth(integration);
  }

  switch (result?.status) {
    case IntegrationConnectionStatusEnum.VALID:
      return { tone: 'success', label: 'Connected', needsReconnect: false };
    case IntegrationConnectionStatusEnum.INVALID:
      return { tone: 'error', label: 'Verification failed', message: result.message, needsReconnect: true };
    case IntegrationConnectionStatusEnum.UNREACHABLE:
      return { tone: 'warning', label: 'Provider unreachable', message: result.message, needsReconnect: false };
    case IntegrationConnectionStatusEnum.INCONCLUSIVE:
      return { tone: 'neutral', label: 'Verification inconclusive', needsReconnect: false };
    default:
      // Not verified yet, the provider can't be verified, or the check couldn't run: the integration is on,
      // which is all we know, so it isn't shown as delivering.
      return { tone: 'neutral', label: 'Active', needsReconnect: false };
  }
}

/** A passing check counts over a stored Error only when it ran after that failure was recorded. */
function isNewerValidCheck(
  integration: IIntegration,
  result: ITestIntegrationConnectionResponse | undefined,
  checkedAt: number
) {
  if (result?.status !== IntegrationConnectionStatusEnum.VALID) return false;
  const failedAt = Date.parse(integration.health?.failedAt ?? '');

  return Number.isFinite(failedAt) && checkedAt > failedAt;
}

function describeFailure(integration: IIntegration) {
  const providerName = providers.find((item) => item.id === integration.providerId)?.displayName ?? integration.name;
  const date = formatHealthDate(integration.health?.failedAt);
  const on = date ? ` on ${date}` : '';

  switch (integration.health?.code) {
    case IntegrationHealthErrorCodeEnum.TOKEN_REVOKED:
      return `${providerName} revoked the token${on}.`;
    case IntegrationHealthErrorCodeEnum.TOKEN_EXPIRED:
      return `The ${providerName} token expired${on}.`;
    default:
      return `${providerName} rejected the credentials${on}.`;
  }
}

/** The provider rejected the stored credentials on a send or a check, so saving new ones is a reconnect. */
function getStoredErrorHealth(integration: IIntegration): IntegrationHealth {
  const date = formatHealthDate(integration.health?.failedAt);

  return {
    tone: 'error',
    label: date ? `Failing since ${date}` : 'Failing',
    message: describeFailure(integration),
    needsReconnect: true,
  };
}

const HEALTH_CACHE_TIME_MS = 10 * 60_000;
/** The caller of `verify` shows its own error, so the app-wide query error toast stays out of it. */
const HEALTH_QUERY_META = { showError: false };

/**
 * Health per integration, from the last "Verify integration" check. Checks never run on their own: for some
 * providers the check sends a real message (e.g. a test email), so it only runs when the user asks with
 * `verify`. A result is kept for a while, so reopening the drawer still shows it.
 */
export function useIntegrationHealth(integrations: IIntegration[], environments: IEnvironment[] | undefined) {
  const queryClient = useQueryClient();

  const runCheck = (integration: IIntegration) => {
    const environment = environments?.find((env) => env._id === integration._environmentId);
    if (!environment) throw new Error('The integration has no environment.');

    return testIntegrationConnection(integration._id, environment);
  };

  const queries = useQueries({
    queries: integrations.map((integration) => ({
      queryKey: getIntegrationHealthQueryKey(integration._id),
      queryFn: () => runCheck(integration),
      // Read the cache only; `verify` is the one way a check starts.
      enabled: false,
      gcTime: HEALTH_CACHE_TIME_MS,
      retry: false,
      meta: HEALTH_QUERY_META,
    })),
  });

  const healthById = new Map(
    integrations.map((integration, index) => {
      const query = queries[index];

      return [integration._id, toHealth(integration, query?.data, !!query?.isFetching, query?.dataUpdatedAt ?? 0)];
    })
  );

  const verify = async (integration: IIntegration) => {
    const result = await queryClient.fetchQuery({
      queryKey: getIntegrationHealthQueryKey(integration._id),
      queryFn: () => runCheck(integration),
      staleTime: 0,
      gcTime: HEALTH_CACHE_TIME_MS,
      retry: false,
      meta: HEALTH_QUERY_META,
    });
    // A valid or invalid answer is saved as the integration's health, which the cards and banners read.
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });

    return result;
  };

  return { healthById, verify };
}
