import { ChatProviderIdEnum } from '@novu/shared';
import { type ReactNode, useMemo } from 'react';
import { RiArrowRightSLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { AgentChatSetupGuide } from '@/components/agents/agent-chat-setup-guide';
import { AgentChatSetupSteps } from '@/components/agents/agent-chat-setup-steps';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import {
  hasAgentInboundConnection,
  isAgentIntegrationConnected,
} from '@/components/agents/is-agent-integration-connected';
import { SetupGuideCard } from '@/components/agents/setup-guide-card';
import { SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { useEnvironment } from '@/context/environment/hooks';
import { useAgentChatPrompt } from '@/hooks/use-agent-chat-prompt';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { SectionLinkButton } from './agent-connected-details-shell';
import { AgentIntegrationGuideHeader } from './agent-integration-guide-layout';
import { AgentIntegrationGuideTransition } from './agent-integration-guide-transition';

const AGENT_CHAT_DISPLAY_NAME = 'Agent Chat';

type AgentChatAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

type AgentChatSetupGuideWithHeaderProps = {
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

function AgentChatSetupGuideWithHeader({
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  children,
  footer,
}: AgentChatSetupGuideWithHeaderProps) {
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
      <span className="text-error-base text-label-xs font-medium leading-4">In setup</span>
    </span>
  );

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4">
      <AgentIntegrationGuideHeader
        providerId={ChatProviderIdEnum.NovuAgentChat}
        providerDisplayName={AGENT_CHAT_DISPLAY_NAME}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />
      <SetupGuideCard label={`Setup ${AGENT_CHAT_DISPLAY_NAME} integration`} rightContent={statusBadge}>
        {children}
        {footer}
      </SetupGuideCard>
    </div>
  );
}

type AgentChatConnectedRecapProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  justConnected?: boolean;
};

function AgentChatConnectedRecap({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  justConnected = false,
}: AgentChatConnectedRecapProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const prompt = useAgentChatPrompt(agent);

  const isConnected = isAgentIntegrationConnected(integrationLink);
  const persistKey = `agent-chat-setup-recap:${currentEnvironment?.slug ?? ''}:${agent.identifier}:${integrationLink.integration.identifier}`;

  const viewActivityHref = useMemo(() => {
    if (!currentEnvironment?.slug) {
      return undefined;
    }

    const path = buildRoute(ROUTES.ACTIVITY_CONVERSATIONS, { environmentSlug: currentEnvironment.slug });

    return `${path}?agentId=${encodeURIComponent(agent.identifier)}`;
  }, [agent.identifier, currentEnvironment?.slug]);

  const handleViewActivity = () => {
    if (viewActivityHref) {
      void navigate(viewActivityHref);
    }
  };

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4">
      <ConnectionConfetti active={justConnected} />
      <AgentIntegrationGuideHeader
        providerId={ChatProviderIdEnum.NovuAgentChat}
        providerDisplayName={AGENT_CHAT_DISPLAY_NAME}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />

      <div
        className={cn(
          'border-stroke-soft bg-bg-weak/30 flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
          isConnected ? 'border-l-success-base border-l-2' : 'border-l-warning-base border-l-2'
        )}
      >
        <div className="text-text-sub text-label-xs flex min-w-0 items-center gap-1.5 leading-4">
          <RiCheckLine className={cn('size-4 shrink-0', isConnected ? 'text-success-base' : 'text-warning-base')} />
          <span className="text-text-strong font-medium">{isConnected ? 'Connected' : 'Action needed'}</span>
          {isConnected ? <span className="text-text-soft hidden sm:inline">— Your app reached this agent.</span> : null}
        </div>
        {viewActivityHref ? (
          <SectionLinkButton icon={RiArrowRightSLine} onClick={handleViewActivity}>
            View activity
          </SectionLinkButton>
        ) : null}
      </div>

      <SetupGuideCard label="Setup steps" persistKey={persistKey} defaultExpanded={false}>
        <SetupStepperRail className="gap-8 py-6 pb-3 pr-3 md:pr-6">
          <AgentChatSetupSteps prompt={prompt} />
        </SetupStepperRail>
      </SetupGuideCard>
    </div>
  );
}

export function AgentChatAgentIntegrationGuide({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: AgentChatAgentIntegrationGuideProps) {
  const integrationId = integrationLink?.integration?._id;
  const isConnected = integrationLink ? hasAgentInboundConnection(integrationLink.connectedAt) : false;

  if (integrationLink && integrationId) {
    return (
      <AgentIntegrationGuideTransition
        key={integrationLink._id}
        isConnected={isConnected}
        providerDisplayName={AGENT_CHAT_DISPLAY_NAME}
        hasUserRolloutPhase={false}
        renderSetupView={(footer) => (
          <AgentChatSetupGuideWithHeader
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
            footer={footer}
          >
            <AgentChatSetupGuide agent={agent} integrationId={integrationId} embedded />
          </AgentChatSetupGuideWithHeader>
        )}
        renderConnectedView={(justConnected) => (
          <AgentChatConnectedRecap
            agent={agent}
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
            justConnected={justConnected}
          />
        )}
      />
    );
  }

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4">
      <p className="text-text-soft text-label-sm leading-5">Connect Agent Chat to see the setup guide.</p>
    </div>
  );
}
