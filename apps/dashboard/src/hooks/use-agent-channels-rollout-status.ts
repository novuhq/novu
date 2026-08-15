import { EmailProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { AgentIntegrationLink } from '@/api/agents';
import { filterUserRolloutLinks } from '@/components/agents/agent-integration-guides/whats-next/whats-next-config';
import { IS_SELF_HOSTED_CE } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import {
  channelFirstConnectedEndpointQueryOptions,
  findFirstGenuineConnectedEndpoint,
} from '@/hooks/use-channel-first-connected-endpoint';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';

const CONVERSATIONS_AVAILABLE = !IS_SELF_HOSTED_CE;

type RolloutStatus = {
  allRolledOut: boolean;
  isSettled: boolean;
};

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
  const dashboardSubscriberId = currentUser?._id ?? '';
  const isMsTeamsWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_MSTEAMS_WHATS_NEXT_ENABLED);
  const isEmailWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_EMAIL_WHATS_NEXT_ENABLED);
  const { integrations, isLoading: isIntegrationsLoading } = useFetchIntegrations();

  const rolloutLinks = useMemo(
    () =>
      filterUserRolloutLinks(links, {
        isMsTeamsWhatsNextEnabled,
        isEmailWhatsNextEnabled,
      }),
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
    queries: chatRolloutLinks.map((link) =>
      channelFirstConnectedEndpointQueryOptions({
        environment: currentEnvironment,
        integrationIdentifier: link.integration.identifier,
        dashboardSubscriberId,
        enabled: CONVERSATIONS_AVAILABLE,
      })
    ),
  });

  const chatEndpointsLoading =
    CONVERSATIONS_AVAILABLE && chatRolloutLinks.length > 0 && endpointQueries.some((query) => query.isLoading);

  const isSettled =
    rolloutLinks.length === 0 || ((!hasEmailRolloutLink || !isIntegrationsLoading) && !chatEndpointsLoading);

  const allRolledOut = useMemo(() => {
    if (rolloutLinks.length === 0) {
      return true;
    }

    if (!dashboardSubscriberId) {
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
