import { EmailProviderIdEnum } from '@novu/shared';
import { useMemo } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { EmailConfigurationCard } from '@/components/agents/email-configuration-card';
import { EmailInboxCard } from '@/components/agents/email-inbox-card';
import { EmailSetupGuide } from '@/components/agents/email-setup-guide';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
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
  const { integrations } = useFetchIntegrations();

  // The shared-inbox feature is gated on the API exposing `defaultDomain` on
  // the linked integration. When set, the cloud auto-provision path is active.
  const isSharedInboxEnabled = Boolean(integrationLink?.integration?.defaultDomain);

  const emailIntegration = useMemo(
    () =>
      integrationId && integrations
        ? integrations.find((i) => i._id === integrationId && i.providerId === EmailProviderIdEnum.NovuAgent)
        : undefined,
    [integrationId, integrations]
  );

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
      {isSharedInboxEnabled && emailIntegration && integrationLink ? (
        <EmailInboxCard
          emailIntegration={emailIntegration}
          defaultInboundAddress={integrationLink.integration.defaultInboundAddress}
          defaultDomain={integrationLink.integration.defaultDomain}
        />
      ) : null}
      {integrationId && <EmailConfigurationCard agent={agent} integrationId={integrationId} />}
      {!isConnected && integrationId && <EmailSetupGuide agent={agent} integrationId={integrationId} embedded />}
    </AgentIntegrationGuideLayout>
  );
}
