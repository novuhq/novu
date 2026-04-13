import type { AgentEntity, AgentIntegrationEntity } from '@novu/dal';

import type { AgentIntegrationResponseDto, AgentResponseDto } from '../dtos';

export function toAgentResponse(agent: AgentEntity): AgentResponseDto {
  return {
    _id: agent._id,
    name: agent.name,
    identifier: agent.identifier,
    description: agent.description,
    _environmentId: agent._environmentId,
    _organizationId: agent._organizationId,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export function toAgentIntegrationResponse(
  link: AgentIntegrationEntity,
  integrationIdentifier: string
): AgentIntegrationResponseDto {
  return {
    _id: link._id,
    _agentId: link._agentId,
    integrationIdentifier,
    _environmentId: link._environmentId,
    _organizationId: link._organizationId,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
