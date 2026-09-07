import { ChatProviderIdEnum, type ICredentials } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { API_HOSTNAME } from '@/config';
import {
  AgentConnectedDetailsShell,
  DetailSection,
  FieldSkeleton,
  ReadOnlyField,
} from './agent-connected-details-shell';

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
  const webhookUrl = buildWebhookUrl(agent._id, integrationLink.integration.identifier);

  return (
    <AgentConnectedDetailsShell
      agent={agent}
      integrationLink={integrationLink}
      providerId={ChatProviderIdEnum.Telegram}
      providerDisplayName="Telegram"
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
      justConnected={justConnected}
    >
      {({ credentials, integrationName, isLoading }) => (
        <TelegramDetailSections
          credentials={credentials}
          isLoading={isLoading}
          botName={integrationName ?? integrationLink.integration.name}
          webhookUrl={webhookUrl}
        />
      )}
    </AgentConnectedDetailsShell>
  );
}

function TelegramDetailSections({
  credentials,
  isLoading,
  botName,
  webhookUrl,
}: {
  credentials?: ICredentials;
  isLoading: boolean;
  botName: string;
  webhookUrl: string;
}) {
  // Telegram stores the BotFather HTTP API token under `apiToken`; `token` holds the internal
  // webhook secret and is intentionally not surfaced here.
  const botToken = (credentials?.apiToken as string | undefined) ?? '';

  return (
    <>
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
    </>
  );
}
