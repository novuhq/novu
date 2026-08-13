import { useCallback, useMemo, useState } from 'react';
import type { AgentResponse } from '@/api/agents';
import {
  AgentChatEmbedResources,
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  buildAgentChatPrompt,
  SUBSCRIBER_ID_PLACEHOLDER,
} from '@/components/agents/agent-chat-setup-content';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { ListeningStatus, ProviderSetupStepperRail, SetupStep, SetupStepperRail } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

export type AgentChatSetupGuideProps = {
  agent: AgentResponse;
  /** Selected integration Mongo `_id` */
  integrationId: string;
  /** First step index (Overview uses `2`, Integrations detail uses `1`) */
  stepOffset?: number;
  onStepsCompleted?: () => void;
  /** Integrations tab: same content without Overview chrome */
  embedded?: boolean;
  isOnboarding?: boolean;
  onWelcomeSent?: () => void;
};

/**
 * Agent Chat has no OAuth or credentials after Connect. Teach embed (Cursor prompt
 * or docs) → first real message (ListeningStatus). Connected matches Slack: first inbound only.
 */
export function AgentChatSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: AgentChatSetupGuideProps) {
  const { currentEnvironment } = useEnvironment();
  const { currentUser } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  const applicationIdentifier = currentEnvironment?.identifier || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const subscriberId = currentUser?._id || SUBSCRIBER_ID_PLACEHOLDER;
  const prompt = useMemo(
    () => buildAgentChatPrompt(agent.name, agent.identifier, applicationIdentifier, subscriberId),
    [agent.name, agent.identifier, applicationIdentifier, subscriberId]
  );

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const base = stepOffset;
  const firstIncompleteStep = isConnected ? base + 2 : base;

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Add Agent Chat to your application"
        description="Open the prompt in Cursor to wire up useAgentChat, or follow the docs."
        fullWidthContent={<AgentChatEmbedResources prompt={prompt} />}
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Send a test message"
        description="Open your app and send a message in Agent Chat."
      />
    </>
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
