import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { type ReactNode, useRef, useState } from 'react';
import { RiArrowRightLine } from 'react-icons/ri';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
import { SetupGuideCard } from '@/components/agents/setup-guide-card';
import { CompletedStepIndicator } from '@/components/agents/setup-guide-primitives';
import { SlackSetupGuide } from '@/components/agents/slack-setup-guide';
import { TeamsSetupGuide } from '@/components/agents/teams-setup-guide';
import { TelegramSetupGuide } from '@/components/agents/telegram-setup-guide';
import { WhatsAppSetupGuide } from '@/components/agents/whatsapp-setup-guide';
import { Button } from '@/components/primitives/button';
import { AgentIntegrationGuideHeader } from './agent-integration-guide-layout';
import { EmailAgentIntegrationGuide } from './email-agent-integration-guide';
import { GenericAgentIntegrationGuide } from './generic-agent-integration-guide';
import { SlackAgentConnectedDetails } from './slack-agent-connected-details';
import { TeamsAgentIntegrationGuide } from './teams-agent-integration-guide';
import { TelegramAgentIntegrationGuide } from './telegram-agent-integration-guide';
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

/**
 * The "Continue" step, rendered inline at the end of the setup card (not as a separate card) so it
 * reads as the natural conclusion of the setup flow and can't be missed/overlooked below the fold.
 *
 * `hasUserRolloutPhase` is true only for providers whose connected view implements the "what's next"
 * user-rollout flow (see `providerHasWhatsNextPhase`). For those we promise the rollout step; every
 * other provider gets a generic continue note so we don't advertise a phase that doesn't exist yet.
 */
function ConnectionSuccessFooter({
  providerDisplayName,
  hasUserRolloutPhase,
  onContinue,
}: {
  providerDisplayName: string;
  hasUserRolloutPhase: boolean;
  onContinue: () => void;
}) {
  const title = hasUserRolloutPhase ? 'Make your agent available to your users' : 'Your agent is connected';
  const description = hasUserRolloutPhase
    ? `You've connected it for yourself. Continue to roll it out so your own users can reach it from their ${providerDisplayName}.`
    : `You've connected ${providerDisplayName} for yourself. Continue to view and manage your connection details.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="border-stroke-soft mt-2 flex flex-col gap-3 border-t pl-8 pt-4 md:flex-row md:items-center md:justify-between md:gap-6"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-px shrink-0">
          <CompletedStepIndicator />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-text-strong text-label-sm font-medium leading-5">{title}</p>
          <p className="text-text-soft text-label-xs leading-4">{description}</p>
        </div>
      </div>
      <Button
        variant="primary"
        size="xs"
        type="button"
        onClick={onContinue}
        trailingIcon={RiArrowRightLine}
        className="shrink-0 self-start md:self-center"
      >
        Continue
      </Button>
    </motion.div>
  );
}

type AgentIntegrationGuideTransitionProps = {
  isConnected: boolean;
  providerDisplayName: string;
  /** Whether this provider's connected view implements the user-rollout "what's next" phase. */
  hasUserRolloutPhase: boolean;
  /** Builds the setup card; `footer` is rendered inline at the end of the card body. */
  renderSetupView: (footer: ReactNode) => ReactNode;
  /** `justConnected` is true only for an in-session connect (used to carry the celebration over). */
  renderConnectedView: (justConnected: boolean) => ReactNode;
};

/**
 * Drives the setup → connected transition for an integration:
 *
 * - Already connected on mount (page refresh / revisit): render the connected view immediately —
 *   no flash of the setup guide, and no celebration replay.
 * - Connected during the session while on the setup guide: keep the setup guide on screen and
 *   surface an explicit "Continue" step *inline at the end of the setup card*. We deliberately avoid
 *   an automatic / timed transition — the connection can land while the user is still in the Slack
 *   app (sending the first message), so the user must always return to a stable success screen and
 *   move forward themselves. Continuing carries the celebration over via `justConnected`.
 *
 * This component is mounted with a `key` of the integration id, so switching integrations resets
 * the transition cleanly.
 */
function AgentIntegrationGuideTransition({
  isConnected,
  providerDisplayName,
  hasUserRolloutPhase,
  renderSetupView,
  renderConnectedView,
}: AgentIntegrationGuideTransitionProps) {
  const connectedOnMountRef = useRef(isConnected);
  const [hasContinued, setHasContinued] = useState(false);

  // Only celebrate / gate a connection that happened while the user was watching the setup guide;
  // an integration that was already connected on mount goes straight to its connected view.
  const justConnected = !connectedOnMountRef.current;
  const showConnected = connectedOnMountRef.current || hasContinued;
  const showContinueStep = justConnected && isConnected && !hasContinued;

  if (showConnected) {
    return <>{renderConnectedView(justConnected)}</>;
  }

  const footer = showContinueStep ? (
    <ConnectionSuccessFooter
      providerDisplayName={providerDisplayName}
      hasUserRolloutPhase={hasUserRolloutPhase}
      onContinue={() => setHasContinued(true)}
    />
  ) : null;

  return <>{renderSetupView(footer)}</>;
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
      case ChatProviderIdEnum.Telegram:
        return (
          <TelegramAgentIntegrationGuide
            embedded={embedded}
            onBack={onBack}
            agent={agent}
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
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
      hasUserRolloutPhase={providerHasWhatsNextPhase(providerId)}
      renderSetupView={renderSetupView}
      renderConnectedView={renderConnectedView}
    />
  );
}
