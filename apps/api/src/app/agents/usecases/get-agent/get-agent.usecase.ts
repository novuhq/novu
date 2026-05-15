import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';
import type { AgentResponseDto } from '../../dtos';
import {
  type ManagedRuntimeHydration,
  type NovuAgentEmailHydration,
  toAgentResponse,
} from '../../mappers/agent-response.mapper';
import { GetAgentCommand } from './get-agent.command';

@Injectable()
export class GetAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: GetAgentCommand): Promise<AgentResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    const [hydration, emailIntegration] = await Promise.all([
      this.loadManagedRuntimeHydration(agent, command.environmentId, command.organizationId),
      this.loadNovuAgentEmailIntegration(agent._id, command.environmentId, command.organizationId),
    ]);

    return toAgentResponse(agent, hydration, emailIntegration);
  }

  /**
   * Load the agent's linked NovuAgent email integration so we can hydrate the
   * computed `defaultInboundAddress` / `defaultDomain` on the response. Returns
   * `null` when the agent has no email integration linked yet.
   */
  private async loadNovuAgentEmailIntegration(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<NovuAgentEmailHydration | null> {
    const links = await this.agentIntegrationRepository.find(
      { _agentId: agentId, _environmentId: environmentId, _organizationId: organizationId },
      '*'
    );
    if (links.length === 0) return null;

    const integrationIds = links.map((l) => l._integrationId).filter(Boolean);
    if (integrationIds.length === 0) return null;

    return this.integrationRepository.findOne(
      {
        _id: { $in: integrationIds } as unknown as string,
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id providerId channel active credentials'
    );
  }

  private async loadManagedRuntimeHydration(
    agent: { runtime?: string; managedRuntime?: { _integrationId: string } },
    environmentId: string,
    organizationId: string
  ): Promise<ManagedRuntimeHydration | undefined> {
    if (agent.runtime !== 'managed' || !agent.managedRuntime?._integrationId) {
      return undefined;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: agent.managedRuntime._integrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['credentials']
    );

    if (!integration) {
      return undefined;
    }

    const decrypted = decryptCredentials(integration.credentials ?? {});

    return {
      externalEnvironmentId: decrypted.externalEnvironmentId ?? undefined,
      externalWorkspaceId: decrypted.externalWorkspaceId ?? undefined,
    };
  }
}
