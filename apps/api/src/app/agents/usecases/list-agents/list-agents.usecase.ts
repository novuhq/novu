import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { DirectionEnum, EmailProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationSummaryDto } from '../../dtos/agent-integration-summary.dto';
import { ListAgentsResponseDto } from '../../dtos/list-agents-response.dto';
import {
  type NovuAgentEmailHydration,
  toAgentIntegrationSummary,
  toAgentResponse,
} from '../../mappers/agent-response.mapper';
import { ListAgentsCommand } from './list-agents.command';

@Injectable()
export class ListAgents {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ListAgentsCommand): Promise<ListAgentsResponseDto> {
    if (command.before && command.after) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const pagination = await this.agentRepository.listAgents({
      after: command.after,
      before: command.before,
      limit: command.limit,
      sortDirection: command.orderDirection === DirectionEnum.ASC ? 1 : -1,
      sortBy: command.orderBy,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      includeCursor: command.includeCursor,
      identifier: command.identifier,
    });

    const { summariesByAgentId, emailIntegrationByAgentId } = await this.loadIntegrationsForAgents(
      command.environmentId,
      command.organizationId,
      pagination.agents
    );

    return {
      data: pagination.agents.map((agent) => ({
        ...toAgentResponse(agent, undefined, emailIntegrationByAgentId.get(agent._id) ?? null),
        integrations: summariesByAgentId.get(agent._id) ?? [],
      })),
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }

  private async loadIntegrationsForAgents(
    environmentId: string,
    organizationId: string,
    agents: { _id: string }[]
  ): Promise<{
    summariesByAgentId: Map<string, AgentIntegrationSummaryDto[]>;
    emailIntegrationByAgentId: Map<string, NovuAgentEmailHydration>;
  }> {
    const summariesByAgentId = new Map<string, AgentIntegrationSummaryDto[]>();
    const emailIntegrationByAgentId = new Map<string, NovuAgentEmailHydration>();

    if (agents.length === 0) {
      return { summariesByAgentId, emailIntegrationByAgentId };
    }

    const agentIds = agents.map((a) => a._id);
    const links = await this.agentIntegrationRepository.findLinksForAgents({
      environmentId,
      organizationId,
      agentIds,
    });

    const integrationIds = [...new Set(links.map((l) => l._integrationId))];

    if (integrationIds.length === 0) {
      for (const id of agentIds) {
        summariesByAgentId.set(id, []);
      }

      return { summariesByAgentId, emailIntegrationByAgentId };
    }

    const integrations = await this.integrationRepository.find(
      {
        _id: { $in: integrationIds },
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      '_id identifier name providerId channel active credentials'
    );

    const summaryByIntegrationId = new Map(integrations.map((i) => [i._id, toAgentIntegrationSummary(i)] as const));
    const integrationByIntegrationId = new Map(integrations.map((i) => [i._id, i] as const));

    const seen = new Map<string, Set<string>>();

    for (const link of links) {
      const summary = summaryByIntegrationId.get(link._integrationId);

      if (!summary) {
        continue;
      }

      let dedupe = seen.get(link._agentId);

      if (!dedupe) {
        dedupe = new Set<string>();
        seen.set(link._agentId, dedupe);
      }

      if (dedupe.has(summary.integrationId)) {
        continue;
      }

      dedupe.add(summary.integrationId);
      const list = summariesByAgentId.get(link._agentId) ?? [];
      list.push(summary);

      summariesByAgentId.set(link._agentId, list);

      const integration = integrationByIntegrationId.get(link._integrationId);
      if (integration?.providerId === EmailProviderIdEnum.NovuAgent && !emailIntegrationByAgentId.has(link._agentId)) {
        emailIntegrationByAgentId.set(link._agentId, {
          _id: integration._id,
          providerId: integration.providerId,
          channel: integration.channel,
          active: integration.active,
          credentials: integration.credentials,
        });
      }
    }

    for (const id of agentIds) {
      if (!summariesByAgentId.has(id)) {
        summariesByAgentId.set(id, []);
      } else {
        const list = summariesByAgentId.get(id) ?? [];
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));

        summariesByAgentId.set(id, sorted);
      }
    }

    return { summariesByAgentId, emailIntegrationByAgentId };
  }
}
