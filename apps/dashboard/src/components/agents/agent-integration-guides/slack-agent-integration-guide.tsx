import { ChatProviderIdEnum, providers } from '@novu/shared';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';
import { AgentIntegrationGuideStep } from './agent-integration-guide-step';

type SlackAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
};

const slackProvider = providers.find((p) => p.id === ChatProviderIdEnum.Slack);

export function SlackAgentIntegrationGuide({ onBack, embedded = false }: SlackAgentIntegrationGuideProps) {
  return (
    <AgentIntegrationGuideLayout
      providerId={ChatProviderIdEnum.Slack}
      providerDisplayName="Slack"
      onBack={onBack}
      embedded={embedded}
      docHref={slackProvider?.docReference}
    >
      <AgentIntegrationGuideSection title="Overview">
        <p>
          Connect Slack so this agent can send and receive chat messages through your workspace. Ensure the integration
          is configured and active in the integration store for this environment.
        </p>
      </AgentIntegrationGuideSection>
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
    </AgentIntegrationGuideLayout>
  );
}
