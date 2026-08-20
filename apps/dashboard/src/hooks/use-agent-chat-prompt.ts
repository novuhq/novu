import { useMemo } from 'react';
import type { AgentResponse } from '@/api/agents';
import { buildAgentChatPrompt } from '@/components/agents/agent-chat-setup-content';

export function useAgentChatPrompt(agent: AgentResponse): string {
  return useMemo(() => buildAgentChatPrompt(agent.name, agent.identifier), [agent.name, agent.identifier]);
}
