import { ChatProviderIdEnum } from '@novu/shared';
import { type ReactNode, useMemo } from 'react';
import { RiArrowRightSLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { WebChatSetupGuide } from '@/components/agents/web-chat-setup-guide';
import { WebChatSetupSteps } from '@/components/agents/web-chat-setup-steps';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import {
  hasAgentInboundConnection,
  isAgentIntegrationConnected,
} from '@/components/agents/is-agent-integration-connected';
import { SetupGuideCard } from '@/components/agents/setup-guide-card';
import { SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { useEnvironment } from '@/context/environment/hooks';
import { useWebChatPreview } from '@/hooks/use-web-chat-preview';
import { resolveWebChatConnectRuntime, useWebChatPrompt } from '@/hooks/use-web-chat-prompt';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { SectionLinkButton } from './agent-connected-details-shell';
import { AgentIntegrationGuideHeader } from './agent-integration-guide-layout';
import { AgentIntegrationGuideTransition } from './agent-integration-guide-transition';

const WEB_CHAT_DISPLAY_NAME = 'Web Chat';

type WebChatAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

type WebChatSetupGuideWithHeaderProps = {
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

function WebChatSetupGuideWithHeader({
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  children,
  footer,
}: WebChatSetupGuideWithHeaderProps) {
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
        providerId={ChatProviderIdEnum.NovuWebChat}
        providerDisplayName={WEB_CHAT_DISPLAY_NAME}
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />
      <SetupGuideCard label={`Setup ${WEB_CHAT_DISPLAY_NAME} integration`} rightContent={statusBadge}>
        {children}
        {footer}
      </SetupGuideCard>
    </div>
  );
}

type WebChatConnectedRecapProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  justConnected?: boolean;
};

function WebChatConnectedRecap({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  justConnected = false,
}: WebChatConnectedRecapProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const prompt = useWebChatPrompt(agent);
  const runtime = resolveWebChatConnectRuntime(agent);
  const { openPreview } = useWebChatPreview();

  const isConnected = isAgentIntegrationConnected(integrationLink);
  const persistKey = `web-chat-setup-recap:${currentEnvironment?.slug ?? ''}:${agent.identifier}:${integrationLink.integration.identifier}`;

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

  const handleOpenChat = () => {
    openPreview(agent.identifier);
  };

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4">
      <ConnectionConfetti active={justConnected} />
      <AgentIntegrationGuideHeader
        providerId={ChatProviderIdEnum.NovuWebChat}
        providerDisplayName={WEB_CHAT_DISPLAY_NAME}
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
        <div className="flex shrink-0 items-center gap-3">
          <SectionLinkButton icon={RiArrowRightSLine} onClick={handleOpenChat}>
            Preview chat
          </SectionLinkButton>
          {viewActivityHref ? (
            <SectionLinkButton icon={RiArrowRightSLine} onClick={handleViewActivity}>
              View activity
            </SectionLinkButton>
          ) : null}
        </div>
      </div>

      <SetupGuideCard label="Setup steps" persistKey={persistKey} defaultExpanded={false}>
        <SetupStepperRail className="gap-8 py-6 pb-3 pr-3 md:pr-6">
          <WebChatSetupSteps
            prompt={prompt}
            agentIdentifier={agent.identifier}
            onOpenChat={handleOpenChat}
            runtime={runtime}
          />
        </SetupStepperRail>
      </SetupGuideCard>
    </div>
  );
}

export function WebChatAgentIntegrationGuide({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: WebChatAgentIntegrationGuideProps) {
  const integrationId = integrationLink?.integration?._id;
  const isConnected = integrationLink ? hasAgentInboundConnection(integrationLink.connectedAt) : false;

  if (integrationLink && integrationId) {
    return (
      <AgentIntegrationGuideTransition
        key={integrationLink._id}
        isConnected={isConnected}
        providerDisplayName={WEB_CHAT_DISPLAY_NAME}
        hasUserRolloutPhase={false}
        renderSetupView={(footer) => (
          <WebChatSetupGuideWithHeader
            integrationLink={integrationLink}
            canRemoveIntegration={canRemoveIntegration}
            onRequestRemoveIntegration={onRequestRemoveIntegration}
            isRemovingIntegration={isRemovingIntegration}
            footer={footer}
          >
            <WebChatSetupGuide agent={agent} integrationId={integrationId} embedded />
          </WebChatSetupGuideWithHeader>
        )}
        renderConnectedView={(justConnected) => (
          <WebChatConnectedRecap
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
      <p className="text-text-soft text-label-sm leading-5">Connect Web Chat to see the setup guide.</p>
    </div>
  );
}
