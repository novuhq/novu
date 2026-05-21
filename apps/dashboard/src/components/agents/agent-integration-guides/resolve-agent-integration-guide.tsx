import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
import { SetupGuideCard } from '@/components/agents/setup-guide-card';
import { SlackSetupGuide } from '@/components/agents/slack-setup-guide';
import { TeamsSetupGuide } from '@/components/agents/teams-setup-guide';
import { TelegramSetupGuide } from '@/components/agents/telegram-setup-guide';
import { WhatsAppSetupGuide } from '@/components/agents/whatsapp-setup-guide';
import { AgentIntegrationGuideHeader } from './agent-integration-guide-layout';
import { EmailAgentIntegrationGuide } from './email-agent-integration-guide';
import { GenericAgentIntegrationGuide } from './generic-agent-integration-guide';
import { SlackAgentIntegrationGuide } from './slack-agent-integration-guide';
import { TeamsAgentIntegrationGuide } from './teams-agent-integration-guide';
import { TelegramAgentIntegrationGuide } from './telegram-agent-integration-guide';
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
};

function SetupGuideWithHeader({
  providerId,
  providerDisplayName,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  children,
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

  // Once the user opens an unconnected integration, keep showing the setup guide so the
  // "Connected" success state (confetti + listening status) stays visible after the
  // backend reports `connectedAt`. Stickiness is scoped to a single integration at a
  // time — switching to a different provider clears it, and a fresh mount (page
  // refresh / leaving the tab) reverts to the management view for already-connected
  // integrations.
  const [stickySetupId, setStickySetupId] = useState<string | null>(null);

  useEffect(() => {
    if (!integrationLink.connectedAt) {
      setStickySetupId(integrationLink._id);

      return;
    }

    setStickySetupId((prev) => (prev === integrationLink._id ? prev : null));
  }, [integrationLink._id, integrationLink.connectedAt]);

  const showSetupGuide = !integrationLink.connectedAt || stickySetupId === integrationLink._id;

  if (providerId === ChatProviderIdEnum.Slack && showSetupGuide) {
    return (
      <SetupGuideWithHeader
        providerId={providerId}
        providerDisplayName="Slack"
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      >
        <SlackSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />
      </SetupGuideWithHeader>
    );
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

  if (providerId === ChatProviderIdEnum.MsTeams && showSetupGuide) {
    return (
      <SetupGuideWithHeader
        providerId={providerId}
        providerDisplayName="MS Teams"
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      >
        <TeamsSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />
      </SetupGuideWithHeader>
    );
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

  if (providerId === ChatProviderIdEnum.Telegram && showSetupGuide) {
    return (
      <SetupGuideWithHeader
        providerId={providerId}
        providerDisplayName="Telegram"
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      >
        <TelegramSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />
      </SetupGuideWithHeader>
    );
  }

  if (providerId === ChatProviderIdEnum.Telegram) {
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
  }

  if (providerId === ChatProviderIdEnum.WhatsAppBusiness && showSetupGuide) {
    return (
      <SetupGuideWithHeader
        providerId={providerId}
        providerDisplayName="WhatsApp Business"
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      >
        <WhatsAppSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />
      </SetupGuideWithHeader>
    );
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
