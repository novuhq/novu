import type { AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';

import type { AgentIntegrationSummaryDto } from '../dtos/agent-integration-summary.dto';
import { toAgentIntegrationSummary } from '../mappers/agent-response.mapper';

export async function loadAgentIntegrationSummariesForAgents(
  agentIntegrationRepository: AgentIntegrationRepository,
  integrationRepository: IntegrationRepository,
  environmentId: string,
  organizationId: string,
  agents: { _id: string }[]
): Promise<Map<string, AgentIntegrationSummaryDto[]>> {
  const result = new Map<string, AgentIntegrationSummaryDto[]>();

  if (agents.length === 0) {
    return result;
  }

  const agentIds = agents.map((a) => a._id);
  const links = await agentIntegrationRepository.findLinksForAgents({
    environmentId,
    organizationId,
    agentIds,
  });

  const integrationIds = [...new Set(links.map((l) => l._integrationId))];

  if (integrationIds.length === 0) {
    for (const id of agentIds) {
      result.set(id, []);
    }

    return result;
  }

  const integrations = await integrationRepository.find(
    {
      _id: { $in: integrationIds },
      _environmentId: environmentId,
      _organizationId: organizationId,
    },
    '_id identifier name providerId channel active'
  );

  const summaryByIntegrationId = new Map(integrations.map((i) => [i._id, toAgentIntegrationSummary(i)] as const));

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
    const list = result.get(link._agentId) ?? [];
    list.push(summary);

    result.set(link._agentId, list);
  }

  for (const id of agentIds) {
    if (!result.has(id)) {
      result.set(id, []);
    } else {
      const list = result.get(id) ?? [];
      const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));

      result.set(id, sorted);
    }
  }

  return result;
}
