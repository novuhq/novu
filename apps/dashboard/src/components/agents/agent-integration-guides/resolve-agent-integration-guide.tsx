import { ChatProviderIdEnum, EmailProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { type ReactNode } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
import { SetupGuideCard } from '@/components/agents/setup-guide-card';
import { SlackSetupGuide } from '@/components/agents/slack-setup-guide';
import { TeamsSetupGuide } from '@/components/agents/teams-setup-guide';
import { TelegramSetupGuide } from '@/components/agents/telegram-setup-guide';
import { WhatsAppSetupGuide } from '@/components/agents/whatsapp-setup-guide';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { AgentIntegrationGuideHeader } from './agent-integration-guide-layout';
import { AgentIntegrationGuideTransition } from './agent-integration-guide-transition';
import { EmailAgentIntegrationGuide } from './email-agent-integration-guide';
import { GenericAgentIntegrationGuide } from './generic-agent-integration-guide';
import { SlackAgentConnectedDetails } from './slack-agent-connected-details';
import { TeamsAgentConnectedDetails } from './teams-agent-connected-details';
import { TelegramAgentConnectedDetails } from './telegram-agent-connected-details';
import { providerHasWhatsNextPhase } from './whats-next/whats-next-config';
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

type SetupGuideWrapperProps = {
  providerId: string;
  providerDisplayName: string;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  children: React.ReactNode;
  /** Rendered at the end of the setup card body, in the same flow (e.g. the "Continue" step). */
  footer?: React.ReactNode;
};

function SetupGuideWithHeader({
  providerId,
  providerDisplayName,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  children,
  footer,
}: SetupGuideWrapperProps) {
  const isConnected = isAgentIntegrationConnected(integrationLink);

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
        providerId={providerId}
        providerDisplayName={providerDisplayName}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />
      <SetupGuideCard label={`Setup ${providerDisplayName} integration`} rightContent={statusBadge}>
        {children}
        {footer}
      </SetupGuideCard>
    </div>
  );
}

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
  const isConnected = Boolean(integrationLink.connectedAt);
  const isMsTeamsWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_MSTEAMS_WHATS_NEXT_ENABLED);

  // MS Teams' user-rollout "what's next" phase is gated behind its own flag; until it's enabled the
  // connected view falls back to the generic "Continue" note (and hides the rollout guide).
  const hasUserRolloutPhase =
    providerHasWhatsNextPhase(providerId) && (providerId !== ChatProviderIdEnum.MsTeams || isMsTeamsWhatsNextEnabled);

  // The auto-provisioned Novu email integration has no distinct setup phase — render its single
  // guide regardless of connection state.
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

  let setupGuide: ReactNode = null;
  let setupDisplayName = '';

  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      setupGuide = <SlackSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
      setupDisplayName = 'Slack';
      break;
    case ChatProviderIdEnum.MsTeams:
      setupGuide = <TeamsSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
      setupDisplayName = 'MS Teams';
      break;
    case ChatProviderIdEnum.Telegram:
      setupGuide = <TelegramSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
      setupDisplayName = 'Telegram';
      break;
    case ChatProviderIdEnum.WhatsAppBusiness:
      setupGuide = <WhatsAppSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
      setupDisplayName = 'WhatsApp Business';
      break;
    default:
      setupGuide = null;
  }

  // Chat providers without a dedicated setup guide fall back to the single generic guide.
  if (!setupGuide) {
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

  const renderSetupView = (footer: ReactNode): ReactNode => (
    <SetupGuideWithHeader
      providerId={providerId}
      providerDisplayName={setupDisplayName}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
      footer={footer}
    >
      {setupGuide}
    </SetupGuideWithHeader>
  );

  const renderConnectedView = (justConnected: boolean): ReactNode => {
    switch (providerId) {
      case ChatProviderIdEnum.Slack:
        return (
          <SlackAgentConnectedDetails
            agent={agent}
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
            justConnected={justConnected}
          />
        );
      case ChatProviderIdEnum.MsTeams:
        return (
          <TeamsAgentConnectedDetails
            agent={agent}
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
            justConnected={justConnected}
          />
        );
      case ChatProviderIdEnum.Telegram:
        return (
          <TelegramAgentConnectedDetails
            agent={agent}
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
            justConnected={justConnected}
          />
        );
      case ChatProviderIdEnum.WhatsAppBusiness:
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
      default:
        return null;
    }
  };

  return (
    <AgentIntegrationGuideTransition
      key={integrationLink._id}
      isConnected={isConnected}
      providerDisplayName={setupDisplayName}
      hasUserRolloutPhase={hasUserRolloutPhase}
      renderSetupView={renderSetupView}
      renderConnectedView={renderConnectedView}
    />
  );
}
