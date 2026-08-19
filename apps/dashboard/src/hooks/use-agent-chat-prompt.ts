import { useMemo } from 'react';
import type { AgentResponse } from '@/api/agents';
import {
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  buildAgentChatPrompt,
  SUBSCRIBER_ID_PLACEHOLDER,
} from '@/components/agents/agent-chat-setup-content';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';

export function useAgentChatPrompt(agent: AgentResponse): string {
  const { currentEnvironment } = useEnvironment();
  const { currentUser } = useAuth();

  const applicationIdentifier = currentEnvironment?.identifier || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const subscriberId = currentUser?._id || SUBSCRIBER_ID_PLACEHOLDER;

  return useMemo(
    () => buildAgentChatPrompt(agent.name, agent.identifier, applicationIdentifier, subscriberId),
    [agent.name, agent.identifier, applicationIdentifier, subscriberId]
  );
}
