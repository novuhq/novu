import type { AgentEntity, AgentIntegrationEntity, IntegrationEntity } from '@novu/dal';
import { AgentRuntimeEnum } from '@novu/dal';

import type { AgentIntegrationResponseDto, AgentIntegrationSummaryDto, AgentResponseDto } from '../dtos';

export function toAgentResponse(agent: AgentEntity): AgentResponseDto {
  const runtime = agent.runtime ?? AgentRuntimeEnum.BRIDGE;

  return {
    _id: agent._id,
    name: agent.name,
    identifier: agent.identifier,
    description: agent.description,
    active: agent.active,
    behavior: agent.behavior,
    runtime,
    managedRuntime: runtime === AgentRuntimeEnum.CLAUDE_MANAGED ? agent.managedRuntime : undefined,
    bridgeUrl: agent.bridgeUrl,
    devBridgeUrl: agent.devBridgeUrl,
    devBridgeActive: agent.devBridgeActive,
    _environmentId: agent._environmentId,
    _organizationId: agent._organizationId,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export function toAgentIntegrationSummary(
  integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'>
): AgentIntegrationSummaryDto {
  return {
    integrationId: integration._id,
    providerId: integration.providerId,
    name: integration.name,
    identifier: integration.identifier,
    channel: integration.channel,
    active: integration.active,
  };
}

export function toAgentIntegrationResponse(
  link: AgentIntegrationEntity,
  integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'>
): AgentIntegrationResponseDto {
  return {
    _id: link._id,
    _agentId: link._agentId,
    integration: {
      _id: integration._id,
      identifier: integration.identifier,
      name: integration.name,
      providerId: integration.providerId,
      channel: integration.channel,
      active: integration.active,
    },
    _environmentId: link._environmentId,
    _organizationId: link._organizationId,
    connectedAt: link.connectedAt ?? null,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
