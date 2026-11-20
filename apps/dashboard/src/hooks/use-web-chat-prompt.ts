import {
  buildWebChatPrompt,
  resolveWebChatConnectRuntime as resolveConnectBridgeRuntime,
  type NovuConnectBridgeRuntime,
} from '@novu/shared';
import { useMemo } from 'react';
import type { AgentResponse } from '@/api/agents';
import type { ConnectorId } from '@/components/agents/connectors/connector-options';
import { apiHostnameManager } from '@/utils/api-hostname-manager';

export function resolveWebChatConnectRuntime(
  agent: AgentResponse,
  connectorId?: ConnectorId
): NovuConnectBridgeRuntime | undefined {
  return resolveConnectBridgeRuntime(agent.runtime, connectorId);
}

export function useWebChatPrompt(agent: AgentResponse, connectorId?: ConnectorId): string {
  const apiUrl = apiHostnameManager.getHostname();
  const runtime = resolveWebChatConnectRuntime(agent, connectorId);

  return useMemo(
    () => buildWebChatPrompt(agent.name, agent.identifier, apiUrl, { runtime }),
    [agent.name, agent.identifier, apiUrl, runtime]
  );
}
