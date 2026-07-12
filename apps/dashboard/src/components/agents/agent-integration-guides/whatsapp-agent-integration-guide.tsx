import { ChatProviderIdEnum, FeatureFlagsKeysEnum, type IIntegration } from '@novu/shared';
import { type ReactNode, useMemo } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import { hasAgentInboundConnection } from '@/components/agents/is-agent-integration-connected';
import { SetupGuideCard } from '@/components/agents/setup-guide-card';
import { WhatsAppInboxCard } from '@/components/agents/whatsapp-inbox-card';
import { WhatsAppSetupGuide } from '@/components/agents/whatsapp-setup-guide';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { AgentIntegrationGuideHeader, AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';
import { AgentIntegrationGuideStep } from './agent-integration-guide-step';
import { AgentIntegrationGuideTransition } from './agent-integration-guide-transition';
import { WhatsAppWhatsNextGuide } from './whats-next/whatsapp-whats-next-guide';

const PROVIDER_DISPLAY_NAME = 'WhatsApp Business';

type WhatsAppAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

type SetupGuideWrapperProps = {
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

function WhatsAppSetupGuideWithHeader({
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  children,
  footer,
}: SetupGuideWrapperProps) {
  const isConnected = hasAgentInboundConnection(integrationLink.connectedAt);

  const statusBadge = isConnected ? (
    <span className="bg-success-lighter flex items-center gap-1 rounded-md px-1 py-0.5">
      <span className="flex size-4 items-center justify-center rounded-full bg-success-lighter">
        <span className="bg-success-base size-1.5 rounded-full" />
      </span>
      <span className="text-success-base text-label-xs font-medium leading-4">Connected</span>
    </span>
  ) : (
    <span className="bg-error-lighter flex items-center gap-1 rounded-md px-1 py-0.5">
      <span className="bg-error-lighter flex size-4 items-center justify-center rounded-full">
        <span className="bg-error-base size-1.5 rounded-full" />
      </span>
      <span className="text-error-base text-label-xs font-medium leading-4">Action needed</span>
    </span>
  );

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4">
      <AgentIntegrationGuideHeader
        providerId={ChatProviderIdEnum.WhatsAppBusiness}
        providerDisplayName={PROVIDER_DISPLAY_NAME}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />
      <SetupGuideCard label={`Setup ${PROVIDER_DISPLAY_NAME} integration`} rightContent={statusBadge}>
        {children}
        {footer}
      </SetupGuideCard>
    </div>
  );
}

function WhatsAppLegacyConnectedOverview() {
  return (
    <AgentIntegrationGuideSection title="Overview">
      <p>
        This agent is connected to WhatsApp Business. Send a message to your business phone number to start a
        conversation: replies are routed through your agent server.
      </p>
    </AgentIntegrationGuideSection>
  );
}

type WhatsAppConnectedViewProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  whatsappIntegration?: IIntegration;
  justConnected: boolean;
};

function WhatsAppConnectedView({
  agent,
  integrationLink,
  whatsappIntegration,
  justConnected,
}: WhatsAppConnectedViewProps) {
  return (
    <>
      <ConnectionConfetti active={justConnected} />
      <WhatsAppWhatsNextGuide agent={agent} integrationLink={integrationLink} justConnected={justConnected} />
      {whatsappIntegration ? <WhatsAppInboxCard whatsappIntegration={whatsappIntegration} /> : null}
    </>
  );
}

export function WhatsAppAgentIntegrationGuide({
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: WhatsAppAgentIntegrationGuideProps) {
  const isConnected = integrationLink ? hasAgentInboundConnection(integrationLink.connectedAt) : false;
  const integrationId = integrationLink?.integration?._id;
  const { integrations } = useFetchIntegrations();
  const isWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_WHATS_NEXT_ENABLED);

  const whatsappIntegration = useMemo(
    () =>
      integrationId && integrations
        ? integrations.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.WhatsAppBusiness)
        : undefined,
    [integrationId, integrations]
  );

  // Flag on: email-shaped setup → connected handoff (Continue after in-session connect, then What's
  // next + WHATSAPP card). Flag off: same Layer-1 setup card, but connected view stays today's overview.
  if (integrationLink && integrationId) {
    return (
      <AgentIntegrationGuideTransition
        key={integrationLink._id}
        isConnected={isConnected}
        providerDisplayName={PROVIDER_DISPLAY_NAME}
        hasUserRolloutPhase={isWhatsNextEnabled}
        renderSetupView={(footer) => (
          <WhatsAppSetupGuideWithHeader
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
            footer={footer}
          >
            <WhatsAppSetupGuide agent={agent} integrationId={integrationId} embedded />
          </WhatsAppSetupGuideWithHeader>
        )}
        renderConnectedView={(justConnected) => (
          <AgentIntegrationGuideLayout
            providerId={ChatProviderIdEnum.WhatsAppBusiness}
            providerDisplayName={PROVIDER_DISPLAY_NAME}
            onBack={onBack}
            embedded={embedded}
            agent={agent}
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
          >
            {isWhatsNextEnabled ? (
              <WhatsAppConnectedView
                agent={agent}
                integrationLink={integrationLink}
                whatsappIntegration={whatsappIntegration}
                justConnected={justConnected}
              />
            ) : (
              <WhatsAppLegacyConnectedOverview />
            )}
          </AgentIntegrationGuideLayout>
        )}
      />
    );
  }

  return (
    <AgentIntegrationGuideLayout
      providerId={ChatProviderIdEnum.WhatsAppBusiness}
      providerDisplayName={PROVIDER_DISPLAY_NAME}
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
          Follow the steps below to create a Meta app, configure the webhook, and verify the connection.
        </p>
      </AgentIntegrationGuideSection>
      <div className="flex flex-col gap-3">
        <p className="text-text-strong text-label-sm font-medium">Steps</p>
        <AgentIntegrationGuideStep
          step={1}
          title="Create a Meta app and get credentials"
          description="Go to developers.facebook.com/apps, create a Business-type app, and add the WhatsApp product. Copy the Access Token and Phone Number ID from WhatsApp > API Setup, and the App Secret from App Settings > Basic. For production, generate a permanent System User Token instead of the temporary access token."
        />
        <AgentIntegrationGuideStep
          step={2}
          title="Configure the webhook"
          description="In your Meta app go to WhatsApp > Configuration. Set the Callback URL to the webhook URL shown above and the Verify Token to the same secret you entered in the credentials. Subscribe to the 'messages' webhook field so the agent receives inbound messages."
        />
        <AgentIntegrationGuideStep
          step={3}
          title="Verify the connection"
          description="Send a WhatsApp message to your business phone number and confirm the agent receives and responds."
        />
      </div>
    </AgentIntegrationGuideLayout>
  );
}
