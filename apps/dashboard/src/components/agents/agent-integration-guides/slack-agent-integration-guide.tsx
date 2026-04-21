import { ChatProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';
import { AgentIntegrationGuideStep } from './agent-integration-guide-step';

type SlackAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

export function SlackAgentIntegrationGuide({
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: SlackAgentIntegrationGuideProps) {
  const isConnected = Boolean(integrationLink?.connectedAt);

  return (
    <AgentIntegrationGuideLayout
      providerId={ChatProviderIdEnum.Slack}
      providerDisplayName="Slack"
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
            This agent is connected to Slack. To send and receive chat messages through your workspace, tag the bot in
            any channel it has been invited to.
          </p>
        ) : (
          <p>
            Connect Slack so this agent can send and receive chat messages through your workspace. Ensure the
            integration is configured and active in the integration store for this environment.
          </p>
        )}
      </AgentIntegrationGuideSection>
      {!isConnected && (
        <div className="flex flex-col gap-3">
          <p className="text-text-strong text-label-sm font-medium">Steps</p>
          <AgentIntegrationGuideStep
            step={1}
            title="Install the Slack app"
            description="Complete OAuth in the integration store and grant the channels your agent should use."
          />
          <AgentIntegrationGuideStep
            step={2}
            title="Verify credentials"
            description="Confirm the integration shows as active for this environment before testing the agent."
          />
          <AgentIntegrationGuideStep
            step={3}
            title="Test from the agent"
            description="Send a test message from your application and confirm delivery in Slack."
          />
        </div>
      )}
    </AgentIntegrationGuideLayout>
  );
}
