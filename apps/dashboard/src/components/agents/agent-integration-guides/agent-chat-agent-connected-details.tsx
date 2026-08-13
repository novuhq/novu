import { ChatProviderIdEnum } from '@novu/shared';
import { useMemo } from 'react';
import { RiArrowRightSLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import {
  AgentChatEmbedResources,
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  buildAgentChatPrompt,
  SUBSCRIBER_ID_PLACEHOLDER,
} from '@/components/agents/agent-chat-setup-content';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
import { SetupGuideCard } from '@/components/agents/setup-guide-card';
import { SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { SectionLinkButton } from './agent-connected-details-shell';
import { AgentIntegrationGuideHeader } from './agent-integration-guide-layout';

const AGENT_CHAT_DISPLAY_NAME = 'Agent Chat';

type AgentChatAgentConnectedDetailsProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  justConnected?: boolean;
};

export function AgentChatAgentConnectedDetails({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  justConnected = false,
}: AgentChatAgentConnectedDetailsProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { currentUser } = useAuth();

  const applicationIdentifier = currentEnvironment?.identifier || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const subscriberId = currentUser?._id || SUBSCRIBER_ID_PLACEHOLDER;
  const prompt = useMemo(
    () => buildAgentChatPrompt(agent.name, agent.identifier, applicationIdentifier, subscriberId),
    [agent.name, agent.identifier, applicationIdentifier, subscriberId]
  );

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
          <SetupStep
            index={1}
            status="completed"
            title="Add Agent Chat to your application"
            description="Open the prompt in Cursor to wire up useAgentChat, or follow the docs."
            fullWidthContent={<AgentChatEmbedResources prompt={prompt} />}
          />
          <SetupStep
            index={2}
            status="completed"
            title="Send a test message"
            description="Open your app and send a message in Agent Chat."
          />
        </SetupStepperRail>
      </SetupGuideCard>
    </div>
  );
}
