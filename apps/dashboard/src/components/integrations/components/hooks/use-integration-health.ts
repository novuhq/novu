import {
  ChannelTypeEnum,
  type IEnvironment,
  type IIntegration,
  IntegrationConnectionStatusEnum,
  type ITestIntegrationConnectionResponse,
} from '@novu/shared';
import { useQueries } from '@tanstack/react-query';
import { testIntegrationConnection } from '@/api/integrations';
import { isDemoIntegration } from '../utils/helpers';

/** How an integration is doing, from its own state and the last "Verify integration" check. */
export type IntegrationHealth = {
  tone: 'success' | 'error' | 'warning' | 'neutral';
  /** Short status, e.g. "Connected" or "Verification failed". */
  label: string;
  /** What the provider said, when the check didn't pass. */
  message?: string;
  /** True when the credentials were rejected, so saving new ones is a reconnect. */
  needsReconnect: boolean;
};

const HEALTH_STALE_TIME_MS = 5 * 60_000;

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
  isChecking: boolean
): IntegrationHealth {
  if (!integration.active) return { tone: 'neutral', label: 'Paused', needsReconnect: false };
  if (isChecking) return { tone: 'neutral', label: 'Verifying…', needsReconnect: false };

  switch (result?.status) {
    case IntegrationConnectionStatusEnum.VALID:
      return { tone: 'success', label: 'Connected', needsReconnect: false };
    case IntegrationConnectionStatusEnum.INVALID:
      return { tone: 'error', label: 'Verification failed', message: result.message, needsReconnect: true };
    case IntegrationConnectionStatusEnum.UNREACHABLE:
      return { tone: 'warning', label: 'Provider unreachable', message: result.message, needsReconnect: false };
    default:
      // The provider can't be verified, or the check couldn't run: the integration is on, which is all we know.
      return { tone: 'success', label: 'Active', needsReconnect: false };
  }
}

/**
 * Verifies each integration with the provider (the same check as "Verify integration") and turns the results
 * into a health per integration. Results are cached for a few minutes, so reopening the drawer doesn't call
 * the provider again. The check only reads; it never changes the integration.
 */
export function useIntegrationHealth(integrations: IIntegration[], environments: IEnvironment[] | undefined) {
  const queries = useQueries({
    queries: integrations.map((integration) => {
      const environment = environments?.find((env) => env._id === integration._environmentId);

      return {
        queryKey: getIntegrationHealthQueryKey(integration._id),
        queryFn: () => {
          if (!environment) throw new Error('The integration has no environment.');

          return testIntegrationConnection(integration._id, environment);
        },
        enabled: !!environment && integration.active && canVerifyIntegration(integration),
        staleTime: HEALTH_STALE_TIME_MS,
        retry: false,
        refetchOnWindowFocus: false,
      };
    }),
  });

  return new Map(
    integrations.map((integration, index) => {
      const query = queries[index];

      return [integration._id, toHealth(integration, query?.data, !!query?.isFetching && !query?.data)];
    })
  );
}
