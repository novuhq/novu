import { ChatProviderIdEnum, EmailProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { type Query, useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { AgentIntegrationLink } from '@/api/agents';
import { type ChannelEndpointsListResponse, listChannelEndpoints } from '@/api/channel-endpoints';
import { providerHasWhatsNextPhase } from '@/components/agents/agent-integration-guides/whats-next/whats-next-config';
import { IS_SELF_HOSTED_CE } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { findFirstGenuineConnectedEndpoint } from '@/hooks/use-channel-first-connected-endpoint';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';

const POLL_INTERVAL_MS = 3000;
const CONVERSATIONS_AVAILABLE = !IS_SELF_HOSTED_CE;

type RolloutStatus = {
  allRolledOut: boolean;
  isSettled: boolean;
};

function isRolloutCapableLink(
  link: AgentIntegrationLink,
  isMsTeamsWhatsNextEnabled: boolean,
  isEmailWhatsNextEnabled: boolean
): boolean {
  const providerId = link.integration.providerId;

  if (providerId === EmailProviderIdEnum.NovuAgent) {
    return isEmailWhatsNextEnabled;
  }

  if (!providerHasWhatsNextPhase(providerId)) {
    return false;
  }

  if (providerId === ChatProviderIdEnum.MsTeams && !isMsTeamsWhatsNextEnabled) {
    return false;
  }

  return true;
}

function isEmailRolloutComplete(
  integrationId: string,
  integrations: ReturnType<typeof useFetchIntegrations>['integrations']
): boolean {
  const emailIntegration = integrations?.find(
    (integration) => integration._id === integrationId && integration.providerId === EmailProviderIdEnum.NovuAgent
  );

  return Boolean(emailIntegration?.credentials?.outboundConnectedAt);
}

/**
 * Whether every rollout-capable connected channel has finished layer-2 onboarding (end-user connect
 * for chat, outbound provider for email). Used by the Overview "What's next" card to swap to the
 * lightweight "Add another channel" nudge once nothing remains to configure for users.
 */
export function useAgentChannelsRolloutStatus(links: AgentIntegrationLink[]): RolloutStatus {
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const dashboardSubscriberId = currentUser?._id ?? null;
  const isMsTeamsWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_MSTEAMS_WHATS_NEXT_ENABLED);
  const isEmailWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_EMAIL_WHATS_NEXT_ENABLED);
  const { integrations, isLoading: isIntegrationsLoading } = useFetchIntegrations();

  const rolloutLinks = useMemo(
    () => links.filter((link) => isRolloutCapableLink(link, isMsTeamsWhatsNextEnabled, isEmailWhatsNextEnabled)),
    [links, isMsTeamsWhatsNextEnabled, isEmailWhatsNextEnabled]
  );

  const chatRolloutLinks = useMemo(
    () => rolloutLinks.filter((link) => link.integration.providerId !== EmailProviderIdEnum.NovuAgent),
    [rolloutLinks]
  );

  const hasEmailRolloutLink = rolloutLinks.some(
    (link) => link.integration.providerId === EmailProviderIdEnum.NovuAgent
  );

  const endpointQueries = useQueries({
    queries: chatRolloutLinks.map((link) => ({
      queryKey: [
        'agent-channel-first-connected-endpoint',
        currentEnvironment?._id,
        link.integration.identifier,
        dashboardSubscriberId,
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listChannelEndpoints({
          // biome-ignore lint/style/noNonNullAssertion: guarded by `enabled` below
          environment: currentEnvironment!,
          integrationIdentifier: link.integration.identifier,
          signal,
        }),
      enabled: CONVERSATIONS_AVAILABLE && Boolean(currentEnvironment),
      refetchOnWindowFocus: false,
      refetchInterval: (query: Query<ChannelEndpointsListResponse>) =>
        findFirstGenuineConnectedEndpoint(query.state.data, dashboardSubscriberId) ? false : POLL_INTERVAL_MS,
    })),
  });

  const chatEndpointsLoading =
    CONVERSATIONS_AVAILABLE && chatRolloutLinks.length > 0 && endpointQueries.some((query) => query.isLoading);

  const isSettled =
    rolloutLinks.length === 0 || ((!hasEmailRolloutLink || !isIntegrationsLoading) && !chatEndpointsLoading);

  const allRolledOut = useMemo(() => {
    if (rolloutLinks.length === 0) {
      return false;
    }

    return rolloutLinks.every((link) => {
      if (link.integration.providerId === EmailProviderIdEnum.NovuAgent) {
        return isEmailRolloutComplete(link.integration._id, integrations);
      }

      if (!CONVERSATIONS_AVAILABLE) {
        return false;
      }

      const queryIndex = chatRolloutLinks.findIndex(
        (chatLink) => chatLink.integration.identifier === link.integration.identifier
      );

      if (queryIndex < 0) {
        return false;
      }

      return findFirstGenuineConnectedEndpoint(endpointQueries[queryIndex]?.data, dashboardSubscriberId) !== null;
    });
  }, [rolloutLinks, chatRolloutLinks, integrations, endpointQueries, dashboardSubscriberId]);

  return { allRolledOut, isSettled };
}
