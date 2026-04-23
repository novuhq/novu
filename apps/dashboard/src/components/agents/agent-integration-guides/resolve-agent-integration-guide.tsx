import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { EmailSetupGuide } from '@/components/agents/email-setup-guide';
import { SlackSetupGuide } from '@/components/agents/slack-setup-guide';
import { TeamsSetupGuide } from '@/components/agents/teams-setup-guide';
import { WhatsAppSetupGuide } from '@/components/agents/whatsapp-setup-guide';
import { EmailAgentIntegrationGuide } from './email-agent-integration-guide';
import { GenericAgentIntegrationGuide } from './generic-agent-integration-guide';
import { SlackAgentIntegrationGuide } from './slack-agent-integration-guide';
import { TeamsAgentIntegrationGuide } from './teams-agent-integration-guide';
import { WhatsAppAgentIntegrationGuide } from './whatsapp-agent-integration-guide';

type ResolveAgentIntegrationGuideProps = {
  integrationLink: AgentIntegrationLink;
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

export function ResolveAgentIntegrationGuide({
  integrationLink,
  onBack,
  embedded = false,
  agent,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: ResolveAgentIntegrationGuideProps) {
  const providerId = integrationLink.integration.providerId;

  if (providerId === ChatProviderIdEnum.Slack && !integrationLink.connectedAt) {
    return <SlackSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
  }

  if (providerId === ChatProviderIdEnum.Slack) {
    return (
      <SlackAgentIntegrationGuide
        embedded={embedded}
        onBack={onBack}
        agent={agent}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />
    );
  }

  if (providerId === ChatProviderIdEnum.MsTeams && !integrationLink.connectedAt) {
    return <TeamsSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
  }

  if (providerId === ChatProviderIdEnum.MsTeams) {
    return (
      <TeamsAgentIntegrationGuide
        embedded={embedded}
        onBack={onBack}
        agent={agent}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />
    );
  }

  if (providerId === ChatProviderIdEnum.WhatsAppBusiness && !integrationLink.connectedAt) {
    return <WhatsAppSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
  }

  if (providerId === ChatProviderIdEnum.WhatsAppBusiness) {
    return (
      <WhatsAppAgentIntegrationGuide
        embedded={embedded}
        onBack={onBack}
        agent={agent}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />
    );
  }

  if (providerId === EmailProviderIdEnum.NovuAgent && !integrationLink.connectedAt) {
    return <EmailSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
  }

  if (providerId === EmailProviderIdEnum.NovuAgent) {
    return (
      <EmailAgentIntegrationGuide
        embedded={embedded}
        onBack={onBack}
        agent={agent}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />
    );
  }

  return (
    <GenericAgentIntegrationGuide
      embedded={embedded}
      providerId={providerId}
      onBack={onBack}
      agent={agent}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
    />
  );
}
