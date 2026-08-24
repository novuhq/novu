import { useCallback, useState } from 'react';
import type { AgentResponse } from '@/api/agents';
import { AgentChatSetupSteps } from '@/components/agents/agent-chat-setup-steps';
import { useAgentChatPreview } from '@/hooks/use-agent-chat-preview';
import { useAgentChatPrompt } from '@/hooks/use-agent-chat-prompt';
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
 * Agent Chat has no OAuth or credentials after Connect. Preview in the dashboard
 * drawer first, then embed via a coding-agent prompt (`npx novu connect --ci`) or
 * the interactive TUI command. Connected still matches Slack: first inbound from
 * the customer's app only.
 */
export function AgentChatSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: AgentChatSetupGuideProps) {
  const prompt = useAgentChatPrompt(agent);
  const { openPreview } = useAgentChatPreview();
  const [isConnected, setIsConnected] = useState(false);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const firstIncompleteStep = isConnected ? undefined : stepOffset + 1;

  const stepsColumn = (
    <AgentChatSetupSteps
      prompt={prompt}
      agentIdentifier={agent.identifier}
      stepOffset={stepOffset}
      firstIncompleteStep={firstIncompleteStep}
      onOpenChat={() => openPreview(agent.identifier)}
    />
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="Web Chat is connected. Your app reached this agent."
      listeningMessage="Send a message from your app to complete setup."
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
