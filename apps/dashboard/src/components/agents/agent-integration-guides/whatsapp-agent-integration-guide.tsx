import { ChatProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';
import { AgentIntegrationGuideStep } from './agent-integration-guide-step';

type WhatsAppAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

export function WhatsAppAgentIntegrationGuide({
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: WhatsAppAgentIntegrationGuideProps) {

  return (
    <AgentIntegrationGuideLayout
      providerId={ChatProviderIdEnum.WhatsAppBusiness}
      providerDisplayName="WhatsApp Business"
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
          Connect WhatsApp Business so this agent can send and receive messages through your business phone number.
          Ensure the integration is configured and active in the integration store for this environment.
        </p>
      </AgentIntegrationGuideSection>
      <div className="flex flex-col gap-3">
        <p className="text-text-strong text-label-sm font-medium">Steps</p>
        <AgentIntegrationGuideStep
          step={1}
          title="Configure credentials"
          description="Add the Access Token, Phone Number ID, App Secret, and Verify Token from the Meta Developer portal into the integration store."
        />
        <AgentIntegrationGuideStep
          step={2}
          title="Set up the webhook"
          description="Paste the agent's webhook URL into your Meta app's WhatsApp webhook configuration and subscribe to the messages field."
        />
        <AgentIntegrationGuideStep
          step={3}
          title="Test from the agent"
          description="Send a WhatsApp message to your business phone number and confirm the agent receives and responds."
        />
      </div>
    </AgentIntegrationGuideLayout>
  );
}
