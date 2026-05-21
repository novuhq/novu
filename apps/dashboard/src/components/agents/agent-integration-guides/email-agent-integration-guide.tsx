import { EmailProviderIdEnum } from '@novu/shared';
import { useMemo } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { EmailConfigurationCardBody } from '@/components/agents/email-configuration-card';
import { EmailInboxCardBody } from '@/components/agents/email-inbox-card';
import { EmailSetupGuide } from '@/components/agents/email-setup-guide';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
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
  const isConnected = integrationLink ? isAgentIntegrationConnected(integrationLink) : false;
  const integrationId = integrationLink?.integration?._id;
  const { integrations } = useFetchIntegrations();

  const isSharedInboxEnabled = Boolean(integrationLink?.integration?.sharedInboundAddress);

  const emailIntegration = useMemo(
    () =>
      integrationId && integrations
        ? integrations.find((i) => i._id === integrationId && i.providerId === EmailProviderIdEnum.NovuAgent)
        : undefined,
    [integrationId, integrations]
  );

  const showInboxSection = isSharedInboxEnabled && emailIntegration && integrationLink;

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
      {emailIntegration && integrationId ? (
        <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
          <div className="flex items-center px-2 py-1.5">
            <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
              EMAIL
            </span>
          </div>
          <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
            {showInboxSection ? (
              <EmailInboxCardBody
                emailIntegration={emailIntegration}
                integrationEmbedded={integrationLink.integration}
                agent={agent}
              />
            ) : null}
            <EmailConfigurationCardBody
              agent={agent}
              integrationId={integrationId}
              defaultSenderName={integrationLink?.integration?.defaultSenderName}
              sharedInboundAddress={integrationLink?.integration?.sharedInboundAddress}
            />
          </div>
        </div>
      ) : null}
      {!isConnected && integrationId && (
        <EmailSetupGuide agent={agent} integrationId={integrationId} embedded integrationLink={integrationLink} />
      )}
    </AgentIntegrationGuideLayout>
  );
}
