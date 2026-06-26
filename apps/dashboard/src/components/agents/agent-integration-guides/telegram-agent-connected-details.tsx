import { ChatProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useMemo } from 'react';
import { RiArrowRightSLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
import { API_HOSTNAME } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { AgentIntegrationGuideHeader } from './agent-integration-guide-layout';
import { DetailSection, FieldSkeleton, ReadOnlyField, SectionLinkButton } from './connected-details-primitives';
import { AgentChannelWhatsNextGuide } from './whats-next/agent-channel-whats-next-guide';

type TelegramAgentConnectedDetailsProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  /**
   * True when the integration connected during this session and we just transitioned in from the
   * setup guide — drives the one-shot celebration so the "success" moment carries over instead of
   * being dropped when the setup card animates away.
   */
  justConnected?: boolean;
};

function buildWebhookUrl(agentId: string, integrationIdentifier: string): string {
  const baseUrl = (API_HOSTNAME ?? 'https://api.novu.co').replace(/\/$/, '');

  return `${baseUrl}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

export function TelegramAgentConnectedDetails({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  justConnected = false,
}: TelegramAgentConnectedDetailsProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const isWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_WHATS_NEXT_ENABLED);
  const { integrations, isLoading } = useFetchIntegrations();

  const integration = useMemo(
    () => integrations?.find((item) => item._id === integrationLink.integration._id),
    [integrations, integrationLink.integration._id]
  );

  const isConnected = isAgentIntegrationConnected(integrationLink);
  const credentials = integration?.credentials;
  // Telegram stores the BotFather HTTP API token under `apiToken`; `token` holds the internal
  // webhook secret and is intentionally not surfaced here.
  const botToken = (credentials?.apiToken as string | undefined) ?? '';
  const botName = integration?.name ?? integrationLink.integration.name;
  const webhookUrl = buildWebhookUrl(agent._id, integrationLink.integration.identifier);

  const viewActivityHref = useMemo(() => {
    if (!currentEnvironment?.slug) return undefined;

    const path = buildRoute(ROUTES.ACTIVITY_CONVERSATIONS, { environmentSlug: currentEnvironment.slug });

    return `${path}?agentId=${encodeURIComponent(agent.identifier)}`;
  }, [agent.identifier, currentEnvironment?.slug]);

  const handleViewActivity = () => {
    if (viewActivityHref) {
      void navigate(viewActivityHref);
    }
  };

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4">
      <ConnectionConfetti active={justConnected} />
      <AgentIntegrationGuideHeader
        providerId={ChatProviderIdEnum.Telegram}
        providerDisplayName="Telegram"
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />

      <div
        className={cn(
          'border-stroke-soft bg-bg-weak/30 flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
          isConnected ? 'border-l-success-base border-l-2' : 'border-l-warning-base border-l-2'
        )}
      >
        <div className="text-text-sub text-label-xs flex min-w-0 items-center gap-1.5 leading-4">
          <RiCheckLine className={cn('size-4 shrink-0', isConnected ? 'text-success-base' : 'text-warning-base')} />
          <span className="text-text-strong font-medium">{isConnected ? 'Connected' : 'Action needed'}</span>
        </div>
        {viewActivityHref ? (
          <SectionLinkButton icon={RiArrowRightSLine} onClick={handleViewActivity}>
            View activity
          </SectionLinkButton>
        ) : null}
      </div>

      {isWhatsNextEnabled ? (
        <AgentChannelWhatsNextGuide
          agent={agent}
          integrationLink={integrationLink}
          credentials={credentials}
          applicationIdentifier={currentEnvironment?.identifier}
        />
      ) : null}

      <DetailSection title="Telegram bot">
        <ReadOnlyField
          label="Bot name"
          value={botName}
          mono={false}
          info="The display name of your connected Telegram bot integration."
        />
        <ReadOnlyField
          label="Webhook URL"
          value={webhookUrl}
          copyable
          info="Novu registers this URL with Telegram (setWebhook) so your bot delivers updates to this agent."
        />
      </DetailSection>

      <DetailSection title="Telegram credentials">
        {isLoading ? <FieldSkeleton /> : <ReadOnlyField label="Bot Token" value={botToken} required secret />}
      </DetailSection>
    </div>
  );
}
