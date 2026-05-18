import { ChatProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';
import { AgentIntegrationGuideStep } from './agent-integration-guide-step';

type TelegramAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

export function TelegramAgentIntegrationGuide({
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: TelegramAgentIntegrationGuideProps) {
  const isConnected = Boolean(integrationLink?.connectedAt);

  return (
    <AgentIntegrationGuideLayout
      providerId={ChatProviderIdEnum.Telegram}
      providerDisplayName="Telegram"
      onBack={onBack}
      embedded={embedded}
      agent={agent}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
    >
      <AgentIntegrationGuideSection title="Overview">
        {isConnected ? (
          <p>
            This agent is connected to Telegram. Send a direct message to your bot to start a conversation — replies
            are routed through your agent server.
          </p>
        ) : (
          <p>
            Connect a Telegram bot so this agent can send and receive messages. Follow the steps below to create a bot
            with BotFather, save the token, and register the webhook.
          </p>
        )}
      </AgentIntegrationGuideSection>
      {!isConnected && (
        <div className="flex flex-col gap-3">
          <p className="text-text-strong text-label-sm font-medium">Steps</p>
          <AgentIntegrationGuideStep
            step={1}
            title="Create a bot with BotFather"
            description="Open @BotFather on Telegram and run /newbot. Follow the prompts to choose a name and username, then copy the entire confirmation message BotFather sends — it contains both the bot link and the API token."
          />
          <AgentIntegrationGuideStep
            step={2}
            title="Save the Bot Token in Novu"
            description="Open the integration credentials form and paste the full BotFather message — the HTTP API token is extracted and pre-filled in the credentials form automatically."
          />
          <AgentIntegrationGuideStep
            step={3}
            title="Connect the webhook"
            description="Use the setup guide to click 'Connect webhook'. Novu generates a secure secret token and registers the webhook URL with Telegram automatically."
          />
          <AgentIntegrationGuideStep
            step={4}
            title="Verify the connection"
            description="Send a direct message to your bot and confirm the agent receives and responds."
          />
        </div>
      )}
    </AgentIntegrationGuideLayout>
  );
}
