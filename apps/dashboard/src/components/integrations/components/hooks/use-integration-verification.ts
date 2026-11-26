import {
  ChannelTypeEnum,
  type IEnvironment,
  type IIntegration,
  IntegrationConnectionStatusEnum,
  type ITestIntegrationConnectionResponse,
} from '@novu/shared';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { testIntegrationConnection } from '@/api/integrations';
import { isDemoIntegration } from '../utils/helpers';

/** What an integration's last "Verify integration" check found, as the drawer shows it. */
export type IntegrationVerification = {
  tone: 'success' | 'error' | 'warning' | 'neutral';
  /** Short status, e.g. "Connected" or "Verification failed". */
  label: string;
  /** What the provider said, when the check didn't pass. */
  message?: string;
};

export function getIntegrationVerificationQueryKey(integrationId: string) {
  return ['integration-verification', integrationId];
}

/** Inbox has no provider credentials, and Novu owns the demo providers' credentials, so neither can be verified. */
export function canVerifyIntegration(integration: IIntegration) {
  return integration.channel !== ChannelTypeEnum.IN_APP && !isDemoIntegration(integration.providerId);
}

function toVerification(
  integration: IIntegration,
  result: ITestIntegrationConnectionResponse | undefined,
  isChecking: boolean
): IntegrationVerification {
  if (!integration.active) return { tone: 'neutral', label: 'Paused' };
  if (isChecking) return { tone: 'neutral', label: 'Verifying…' };

  switch (result?.status) {
    case IntegrationConnectionStatusEnum.VALID:
      return { tone: 'success', label: 'Connected' };
    case IntegrationConnectionStatusEnum.INVALID:
      return { tone: 'error', label: 'Verification failed', message: result.message };
    case IntegrationConnectionStatusEnum.UNREACHABLE:
      return { tone: 'warning', label: 'Provider unreachable', message: result.message };
    case IntegrationConnectionStatusEnum.INCONCLUSIVE:
      return { tone: 'neutral', label: 'Verification inconclusive' };
    default:
      // Not verified yet, the provider can't be verified, or the check couldn't run: the integration is on,
      // which is all we know, so it isn't shown as delivering.
      return { tone: 'neutral', label: 'Active' };
  }
}

const VERIFICATION_CACHE_TIME_MS = 10 * 60_000;
/** The caller of `verify` shows its own error, so the app-wide query error toast stays out of it. */
const VERIFICATION_QUERY_META = { showError: false };

/**
 * The last "Verify integration" result per integration. Checks never run on their own: for some
 * providers the check sends a real message (e.g. a test email), so it only runs when the user asks with
 * `verify`. A result is kept for a while, so reopening the drawer still shows it.
 */
export function useIntegrationVerification(integrations: IIntegration[], environments: IEnvironment[] | undefined) {
  const queryClient = useQueryClient();

  const runCheck = (integration: IIntegration) => {
    const environment = environments?.find((env) => env._id === integration._environmentId);
    if (!environment) throw new Error('The integration has no environment.');

    return testIntegrationConnection(integration._id, environment);
  };

  const queries = useQueries({
    queries: integrations.map((integration) => ({
      queryKey: getIntegrationVerificationQueryKey(integration._id),
      queryFn: () => runCheck(integration),
      // Read the cache only; `verify` is the one way a check starts.
      enabled: false,
      gcTime: VERIFICATION_CACHE_TIME_MS,
      retry: false,
      meta: VERIFICATION_QUERY_META,
    })),
  });

  const verificationById = new Map(
    integrations.map((integration, index) => {
      const query = queries[index];

      return [integration._id, toVerification(integration, query?.data, !!query?.isFetching)];
    })
  );

  const verify = async (integration: IIntegration) => {
    return queryClient.fetchQuery({
      queryKey: getIntegrationVerificationQueryKey(integration._id),
      queryFn: () => runCheck(integration),
      staleTime: 0,
      gcTime: VERIFICATION_CACHE_TIME_MS,
      retry: false,
      meta: VERIFICATION_QUERY_META,
    });
  };

  return { verificationById, verify };
}
