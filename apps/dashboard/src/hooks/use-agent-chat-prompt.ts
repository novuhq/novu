import { buildAgentChatPrompt, isNovuConnectBridgeRuntime, type NovuConnectBridgeRuntime } from '@novu/shared';
import { useMemo } from 'react';
import type { AgentResponse } from '@/api/agents';
import type { ConnectorId } from '@/components/agents/connectors/connector-options';
import { apiHostnameManager } from '@/utils/api-hostname-manager';

export function resolveAgentChatConnectRuntime(
  agent: AgentResponse,
  connectorId?: ConnectorId
): NovuConnectBridgeRuntime | undefined {
  if (agent.runtime === 'managed') {
    return undefined;
  }

  if (isNovuConnectBridgeRuntime(connectorId)) {
    return connectorId;
  }

  return undefined;
}

export function useAgentChatPrompt(agent: AgentResponse, connectorId?: ConnectorId): string {
  const apiUrl = apiHostnameManager.getHostname();
  const runtime = resolveAgentChatConnectRuntime(agent, connectorId);

  return useMemo(
    () => buildAgentChatPrompt(agent.name, agent.identifier, apiUrl, { runtime }),
    [agent.name, agent.identifier, apiUrl, runtime]
  );
}
