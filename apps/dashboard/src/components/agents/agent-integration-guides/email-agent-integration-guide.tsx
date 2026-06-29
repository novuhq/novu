import { EmailProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useMemo } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import { EmailConfigurationCardBody } from '@/components/agents/email-configuration-card';
import { EmailInboxCardBody } from '@/components/agents/email-inbox-card';
import { EmailSetupGuide } from '@/components/agents/email-setup-guide';
import {
  hasAgentInboundConnection,
  isAgentIntegrationConnected,
} from '@/components/agents/is-agent-integration-connected';
import { IS_SELF_HOSTED_EE } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { AGENT_EMAIL_PROVIDER_LABEL } from '@/utils/agent-email-provider-display';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideTransition } from './agent-integration-guide-transition';
import { EmailWhatsNextGuide } from './whats-next/email-whats-next-guide';

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
  const isEmailLayer1Complete = integrationLink ? hasAgentInboundConnection(integrationLink.connectedAt) : false;
  const integrationId = integrationLink?.integration?._id;
  const { integrations } = useFetchIntegrations();
  const isEmailWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_EMAIL_WHATS_NEXT_ENABLED);

  const isSharedInboxEnabled = Boolean(integrationLink?.integration?.sharedInboundAddress);

  const emailIntegration = useMemo(
    () =>
      integrationId && integrations
        ? integrations.find((i) => i._id === integrationId && i.providerId === EmailProviderIdEnum.NovuAgent)
        : undefined,
    [integrationId, integrations]
  );

  const showInboxSection = Boolean((isSharedInboxEnabled || IS_SELF_HOSTED_EE) && emailIntegration && integrationLink);

  // Layer 2: once connected, the production-hardening controls (own provider, custom domain,
  // branded address, custom From) live in the guided "What's next" card. The provider/sender
  // config card is then redundant, and the inbox card's custom-domain add-form is owned by the
  // guide — so we hide both here to keep a single source of truth.
  const showConfigCard = !isEmailWhatsNextEnabled;
  const showEmailCard = Boolean(emailIntegration && integrationId && (showInboxSection || showConfigCard));

  const emailCard =
    showEmailCard && emailIntegration && integrationId ? (
      <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
        <div className="flex items-center px-2 py-1.5">
          <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
            EMAIL
          </span>
        </div>
        <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
          {showInboxSection && integrationLink ? (
            <EmailInboxCardBody
              emailIntegration={emailIntegration}
              integrationEmbedded={integrationLink.integration}
              agent={agent}
              hideCustomAddressForm={isEmailWhatsNextEnabled}
            />
          ) : null}
          {showConfigCard ? (
            <EmailConfigurationCardBody
              agent={agent}
              integrationId={integrationId}
              defaultSenderName={integrationLink?.integration?.defaultSenderName}
              sharedInboundAddress={integrationLink?.integration?.sharedInboundAddress}
            />
          ) : null}
        </div>
      </div>
    ) : null;

  // Flag on: mirror the chat channels' setup -> connected handoff. An in-session connection keeps
  // the layer-1 setup card on screen with an explicit "Continue" step (ConnectionSuccessFooter)
  // instead of snapping straight to the layer-2 "What's next" guide; revisiting an already-connected
  // integration goes straight to layer 2. The transition is keyed by the link id so switching
  // integrations resets it cleanly.
  const body =
    isEmailWhatsNextEnabled && integrationLink && integrationId ? (
      <AgentIntegrationGuideTransition
        key={integrationLink._id}
        isConnected={isEmailLayer1Complete}
        providerDisplayName={AGENT_EMAIL_PROVIDER_LABEL}
        hasUserRolloutPhase
        renderSetupView={(footer) => (
          <>
            <EmailSetupGuide agent={agent} integrationId={integrationId} embedded integrationLink={integrationLink} />
            {footer}
          </>
        )}
        renderConnectedView={(justConnected) => (
          <>
            <ConnectionConfetti active={justConnected} />
            <EmailWhatsNextGuide agent={agent} integrationLink={integrationLink} />
            {emailCard}
          </>
        )}
      />
    ) : (
      <>
        {emailCard}
        {!isConnected && integrationId ? (
          <EmailSetupGuide agent={agent} integrationId={integrationId} embedded integrationLink={integrationLink} />
        ) : null}
      </>
    );

  return (
    <AgentIntegrationGuideLayout
      providerId={EmailProviderIdEnum.NovuAgent}
      providerDisplayName={AGENT_EMAIL_PROVIDER_LABEL}
      onBack={onBack}
      embedded={embedded}
      agent={agent}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
    >
      {body}
    </AgentIntegrationGuideLayout>
  );
}
