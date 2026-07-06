import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { AgentConfigResolver, ResolvedAgentConfig } from '../agent-config-resolver.service';

export interface ResolveWebAgentContextParams {
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
  /** Optional override when an agent has multiple web integrations. */
  integrationIdentifier?: string;
}

/**
 * Resolves the agent + web integration a subscriber-JWT request addresses.
 * The agent is looked up by identifier WITHIN the JWT's environment — that
 * scoping (not the config resolver, which loads agents globally by id) is what
 * prevents cross-environment access.
 */
@Injectable()
export class ResolveWebAgentContext {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentConfigResolver: AgentConfigResolver
  ) {}

  async resolve(params: ResolveWebAgentContextParams): Promise<ResolvedAgentConfig> {
    const agent = await this.agentRepository.findOne(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        identifier: params.agentIdentifier,
      },
      ['_id', 'identifier']
    );

    if (!agent) {
      throw new NotFoundException(`Agent ${params.agentIdentifier} not found`);
    }

    const integrationIdentifier =
      params.integrationIdentifier ??
      (await this.resolveDefaultWebIntegrationIdentifier(agent._id, params.environmentId, params.organizationId));

    const config = await this.agentConfigResolver.resolve(agent._id, integrationIdentifier);

    if (config.environmentId !== params.environmentId || config.platform !== AgentPlatformEnum.WEB) {
      throw new NotFoundException(`Agent ${params.agentIdentifier} has no web chat integration`);
    }

    return config;
  }

  private async resolveDefaultWebIntegrationIdentifier(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<string> {
    const links = await this.agentIntegrationRepository.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentId: agentId,
      },
      ['_integrationId']
    );

    if (!links.length) {
      throw new NotFoundException('Web chat is not enabled for this agent');
    }

    const webIntegrations = await this.integrationRepository.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _id: { $in: links.map((link) => link._integrationId) },
        providerId: ChatProviderIdEnum.NovuWeb,
      },
      'identifier'
    );

    if (webIntegrations.length === 0) {
      throw new NotFoundException('Web chat is not enabled for this agent');
    }

    if (webIntegrations.length > 1) {
      throw new BadRequestException('Agent has multiple web integrations — pass ?integrationIdentifier= to select one');
    }

    return webIntegrations[0].identifier;
  }
}
