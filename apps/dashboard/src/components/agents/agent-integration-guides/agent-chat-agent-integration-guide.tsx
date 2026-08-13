import { ChatProviderIdEnum } from '@novu/shared';
import { type ReactNode } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { AgentChatSetupGuide } from '@/components/agents/agent-chat-setup-guide';
import { hasAgentInboundConnection } from '@/components/agents/is-agent-integration-connected';
import { SetupGuideCard } from '@/components/agents/setup-guide-card';
import { AgentChatAgentConnectedDetails } from './agent-chat-agent-connected-details';
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

export function AgentChatAgentIntegrationGuide({
  onBack: _onBack,
  embedded: _embedded = false,
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
          <AgentChatAgentConnectedDetails
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
