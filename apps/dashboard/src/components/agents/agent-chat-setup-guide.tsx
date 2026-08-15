import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { AgentChatSetupSteps } from '@/components/agents/agent-chat-setup-steps';
import { useEnvironment } from '@/context/environment/hooks';
import { useAgentChatPrompt } from '@/hooks/use-agent-chat-prompt';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { AGENT_DETAILS_CHAT_TAB, buildRoute } from '@/utils/routes';
import { ListeningStatus, ProviderSetupStepperRail, SetupStepperRail } from './setup-guide-primitives';

export type AgentChatSetupGuideProps = {
  agent: AgentResponse;
  /** Selected integration Mongo `_id` */
  integrationId: string;
  /** First step index (Overview uses `2`, Integrations detail uses `1`) */
  stepOffset?: number;
  onStepsCompleted?: () => void;
  /** Integrations tab: same content without Overview chrome */
  embedded?: boolean;
};

/**
 * Agent Chat has no OAuth or credentials after Connect. Try in the dashboard
 * first, then teach embed (Cursor prompt or docs). Connected still matches
 * Slack: first inbound from the customer's app only.
 */
export function AgentChatSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: AgentChatSetupGuideProps) {
  const prompt = useAgentChatPrompt(agent);
  const navigate = useNavigate();
  const location = useLocation();
  const agentRoutes = useAgentRoutes();
  const { currentEnvironment } = useEnvironment();
  const [isConnected, setIsConnected] = useState(false);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const handleOpenChat = useCallback(() => {
    if (!currentEnvironment?.slug) {
      return;
    }

    void navigate(
      `${buildRoute(agentRoutes.detailsTab, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agent.identifier),
        agentTab: AGENT_DETAILS_CHAT_TAB,
      })}${location.search}`
    );
  }, [agent.identifier, agentRoutes.detailsTab, currentEnvironment?.slug, location.search, navigate]);

  const base = stepOffset;
  const firstIncompleteStep = isConnected ? base + 3 : base;

  const stepsColumn = (
    <AgentChatSetupSteps
      prompt={prompt}
      stepOffset={stepOffset}
      firstIncompleteStep={firstIncompleteStep}
      onOpenChat={handleOpenChat}
    />
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="Agent Chat is connected. Your app reached this agent."
      listeningMessage="Send a message in your app. We mark the channel Connected when it arrives."
    />
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <SetupStepperRail className="py-6 pb-3 pr-3 md:pr-6">{stepsColumn}</SetupStepperRail>
        <div className="pl-8">{listening}</div>
      </div>
    );
  }

  return (
    <>
      <ProviderSetupStepperRail>{stepsColumn}</ProviderSetupStepperRail>
      <div className="pl-8">{listening}</div>
    </>
  );
}
