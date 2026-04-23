import { EmailProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { EmailSetupGuide } from '@/components/agents/email-setup-guide';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';

type EmailAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

export function EmailAgentIntegrationGuide({
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: EmailAgentIntegrationGuideProps) {
  const isConnected = Boolean(integrationLink?.connectedAt);
  const integrationId = integrationLink?.integration?._id;

  return (
    <AgentIntegrationGuideLayout
      providerId={EmailProviderIdEnum.NovuAgent}
      providerDisplayName="Novu Email"
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
            This agent is connected to email. Subscribers can send emails to the configured inbound address to start
            conversations, and the agent will reply through the selected outbound provider.
          </p>
        ) : (
          <p>
            Connect email so this agent can send and receive messages via email. Configure an outbound email provider and
            an inbound address below.
          </p>
        )}
      </AgentIntegrationGuideSection>
      {!isConnected && integrationId && (
        <EmailSetupGuide agent={agent} integrationId={integrationId} embedded />
      )}
    </AgentIntegrationGuideLayout>
  );
}
