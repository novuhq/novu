import { useMemo } from 'react';
import type { AgentResponse } from '@/api/agents';
import { buildAgentChatPrompt } from '@/components/agents/agent-chat-setup-content';
import { apiHostnameManager } from '@/utils/api-hostname-manager';

export function useAgentChatPrompt(agent: AgentResponse): string {
  const apiUrl = apiHostnameManager.getHostname();

  return useMemo(
    () => buildAgentChatPrompt(agent.name, agent.identifier, apiUrl),
    [agent.name, agent.identifier, apiUrl]
  );
}
