import { ChatProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';
import { AgentIntegrationGuideStep } from './agent-integration-guide-step';

type TeamsAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

export function TeamsAgentIntegrationGuide({
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: TeamsAgentIntegrationGuideProps) {
  return (
    <AgentIntegrationGuideLayout
      providerId={ChatProviderIdEnum.MsTeams}
      providerDisplayName="MS Teams"
      onBack={onBack}
      embedded={embedded}
      agent={agent}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
    >
      <AgentIntegrationGuideSection title="Overview">
        <p>
          This agent is connected to Microsoft Teams via an Azure Bot. Messages sent to the bot in channels, group
          chats, or DMs are forwarded to the agent and replies are posted back into the same thread.
        </p>
      </AgentIntegrationGuideSection>
      <div className="flex flex-col gap-3">
        <p className="text-text-strong text-label-sm font-medium">Setup checklist</p>
        <AgentIntegrationGuideStep
          step={1}
          title="Azure Bot registered"
          description="The messaging endpoint should point to the webhook URL above with the Teams channel enabled."
        />
        <AgentIntegrationGuideStep
          step={2}
          title="Teams app installed"
          description="A Teams app manifest with the bot ID has been packaged and uploaded to the target workspace."
        />
        <AgentIntegrationGuideStep
          step={3}
          title="Verified"
          description="@mention the bot in a channel or send it a direct message and confirm the agent responds."
        />
      </div>
    </AgentIntegrationGuideLayout>
  );
}
