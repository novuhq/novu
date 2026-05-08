import { EmailProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { EmailConfigurationCard } from '@/components/agents/email-configuration-card';
import { EmailSetupGuide } from '@/components/agents/email-setup-guide';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';

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
      {integrationId && <EmailConfigurationCard agent={agent} integrationId={integrationId} />}
      {!isConnected && integrationId && <EmailSetupGuide agent={agent} integrationId={integrationId} embedded />}
    </AgentIntegrationGuideLayout>
  );
}
