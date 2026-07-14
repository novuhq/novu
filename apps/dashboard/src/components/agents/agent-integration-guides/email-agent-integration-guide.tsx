import { EmailProviderIdEnum, FeatureFlagsKeysEnum, type IIntegration } from '@novu/shared';
import { type ReactNode, useMemo } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import { EmailConfigurationCardBody } from '@/components/agents/email-configuration-card';
import { EmailInboxCardBody } from '@/components/agents/email-inbox-card';
import { EmailSetupGuide } from '@/components/agents/email-setup-guide';
import { hasAgentInboundConnection } from '@/components/agents/is-agent-integration-connected';
import { IS_SELF_HOSTED_EE } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useWhatsNextGuideSession } from '@/hooks/use-whats-next-default-expanded';
import { AGENT_EMAIL_PROVIDER_LABEL } from '@/utils/agent-channel-provider-display';
import { shouldShowWhatsNextGuide } from '@/utils/whats-next-guide';
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
  const isConnected = integrationLink ? hasAgentInboundConnection(integrationLink.connectedAt) : false;
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

  // Layer 2: once connected, the "What's next" card holds the provider upgrade. On cloud the
  // custom-domain / branded-address flow moves into the EMAIL card below (the inbox card owns the
  // add-form); on self-hosted EE that flow stays inline in the guide, so the inbox card's add-form
  // is hidden there. Custom From always lives in the EMAIL card. The full provider/sender config
  // card is only shown when the flag is off.
  const showConfigCard = !isEmailWhatsNextEnabled;
  const showSenderAddressRow = isEmailWhatsNextEnabled;
  const showEmailCard = Boolean(
    emailIntegration && integrationId && (showInboxSection || showConfigCard || showSenderAddressRow)
  );

  // The sender-address row can also host the outbound provider selector. It stays hidden while the
  // "What's next" guide is up (the guide owns that selector during layer-2 onboarding) and is
  // surfaced here once the guide retires; see `EmailConnectedView`.
  const renderEmailCard = (showOutboundProvider: boolean) =>
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
              hideCustomAddressForm={isEmailWhatsNextEnabled && IS_SELF_HOSTED_EE}
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
          {showSenderAddressRow ? (
            <EmailConfigurationCardBody
              agent={agent}
              integrationId={integrationId}
              defaultSenderName={integrationLink?.integration?.defaultSenderName}
              sharedInboundAddress={integrationLink?.integration?.sharedInboundAddress}
              showOutboundProvider={showOutboundProvider}
              senderTitle="Set a custom From address"
              senderDescription="Send replies from your own address instead of the agent inbox."
              senderInfoTooltip="Reply-To always points back to the agent, so subscriber replies stay in the thread no matter which From address you use."
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
        isConnected={isConnected}
        providerDisplayName={AGENT_EMAIL_PROVIDER_LABEL}
        hasUserRolloutPhase
        renderSetupView={(footer) => (
          <>
            <EmailSetupGuide agent={agent} integrationId={integrationId} embedded integrationLink={integrationLink} />
            {footer}
          </>
        )}
        renderConnectedView={(justConnected) => (
          <EmailConnectedView
            agent={agent}
            integrationLink={integrationLink}
            emailIntegration={emailIntegration}
            justConnected={justConnected}
            renderEmailCard={renderEmailCard}
          />
        )}
      />
    ) : (
      <>
        {renderEmailCard(true)}
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

type EmailConnectedViewProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  emailIntegration?: IIntegration;
  /** True when the integration connected during this session (drives the celebration + fresh session). */
  justConnected: boolean;
  renderEmailCard: (showOutboundProvider: boolean) => ReactNode;
};

/**
 * Layer-2 connected view: the "What's next" guide plus the EMAIL card.
 *
 * The guide owns the "Send from your own email provider" selector, but it retires itself ~a day
 * after the demo -> own-provider switch (see `shouldShowWhatsNextGuide`). Without this, the selector
 * would vanish entirely once the guide is gone, leaving no way to change the production sending
 * provider. So we surface it back inside the EMAIL card at exactly the moment the guide hides, using
 * the same visibility decision so the two never show it at once.
 */
function EmailConnectedView({
  agent,
  integrationLink,
  emailIntegration,
  justConnected,
  renderEmailCard,
}: EmailConnectedViewProps) {
  const { isFreshSession } = useWhatsNextGuideSession(justConnected);
  const completedAt = emailIntegration?.credentials.outboundConnectedAt ?? null;
  const showOutboundProvider = !shouldShowWhatsNextGuide(completedAt, { isFreshSession });

  return (
    <>
      <ConnectionConfetti active={justConnected} />
      <EmailWhatsNextGuide agent={agent} integrationLink={integrationLink} justConnected={justConnected} />
      {renderEmailCard(showOutboundProvider)}
    </>
  );
}
