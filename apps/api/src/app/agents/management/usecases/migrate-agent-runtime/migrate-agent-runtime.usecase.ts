import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  decryptCredentials,
  getAgentRuntimeProvider,
  getNovuManagedClaudeApiKey,
  resolveAgentRuntime,
} from '@novu/application-generic';
import { AgentRepository, ConversationRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_MANAGED_DEFINITION_VERSION, AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { MigrateAgentRuntimeCommand } from './migrate-agent-runtime.command';

@Injectable()
export class MigrateAgentRuntime {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly analyticsService: AnalyticsService
  ) {}

  async execute(command: MigrateAgentRuntimeCommand): Promise<{ integrationId: string; externalAgentId: string }> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'name', 'runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    if (agent.runtime !== 'managed' || !agent.managedRuntime) {
      throw new BadRequestException('Only managed-runtime agents can be migrated.');
    }

    const sourceIntegration = await this.integrationRepository.findOne(
      {
        _id: agent.managedRuntime._integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'providerId', 'kind', 'credentials']
    );

    if (!sourceIntegration || sourceIntegration.providerId !== AgentRuntimeProviderIdEnum.NovuAnthropic) {
      throw new BadRequestException('Agent is not running on the Novu managed Claude demo integration.');
    }

    const targetIntegration = await this.integrationRepository.findOne(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'providerId', 'kind', 'active', 'credentials']
    );

    if (!targetIntegration) {
      throw new NotFoundException(`Integration "${command.integrationId}" was not found.`);
    }

    if (
      targetIntegration.kind !== IntegrationKindEnum.AGENT ||
      targetIntegration.providerId !== AgentRuntimeProviderIdEnum.Anthropic ||
      !targetIntegration.active
    ) {
      throw new BadRequestException('Target integration must be an active Anthropic agent runtime integration.');
    }

    const targetResolved = resolveAgentRuntime(targetIntegration.providerId, targetIntegration.credentials);

    if (!targetResolved) {
      throw new BadRequestException('Target integration has no API key configured.');
    }

    const targetCredentials = targetResolved.credentials;

    if (!targetCredentials.externalEnvironmentId) {
      throw new BadRequestException('Target integration is not fully provisioned yet.');
    }

    const sourceCredentials = decryptCredentials(sourceIntegration.credentials ?? {});
    const sourceProvider = getAgentRuntimeProvider(
      AgentRuntimeProviderIdEnum.NovuAnthropic,
      getNovuManagedClaudeApiKey()
    );
    const targetProvider = targetResolved.provider;

    const config = await sourceProvider.getConfig(agent.managedRuntime.externalAgentId);
    const created = await targetProvider.createAgent({
      name: agent.name,
      model: config.model,
      systemPrompt: config.systemPrompt,
      tools: config.tools.map((tool) => tool.externalId),
      mcpServers: config.mcpServers.map((server) => ({ name: server.name, url: server.url })),
      skills: config.skills,
    });

    try {
      await this.agentRepository.withTransaction(async (session) => {
        await this.agentRepository.update(
          {
            _id: agent._id,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          {
            $set: {
              managedRuntime: {
                providerId: AgentRuntimeProviderIdEnum.Anthropic,
                _integrationId: targetIntegration._id,
                externalAgentId: created.externalAgentId,
                managedDefinitionVersion: AGENT_MANAGED_DEFINITION_VERSION,
              },
            },
          },
          session ? { session } : {}
        );

        await this.conversationRepository.clearExternalSessionIdsForAgent(
          command.environmentId,
          command.organizationId,
          agent._id,
          session ? { session } : undefined
        );

        const remainingDemoAgents = await this.agentRepository.find(
          {
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
            'managedRuntime._integrationId': sourceIntegration._id,
          },
          ['_id'],
          session ? { session } : {}
        );

        if (remainingDemoAgents.length === 0) {
          await this.integrationRepository.delete(
            {
              _id: sourceIntegration._id,
              _environmentId: command.environmentId,
              _organizationId: command.organizationId,
            },
            session ? { session } : {}
          );
        }
      });
    } catch (error) {
      await targetProvider.deleteAgent(created.externalAgentId).catch(() => undefined);

      throw error;
    }

    this.analyticsService.track('[Novu Managed Claude] - Upgraded to own key', command.userId, {
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      sourceIntegrationId: sourceIntegration._id,
      targetIntegrationId: targetIntegration._id,
      previousExternalEnvironmentId: sourceCredentials.externalEnvironmentId,
      nextExternalEnvironmentId: targetCredentials.externalEnvironmentId,
    });

    return {
      integrationId: targetIntegration._id,
      externalAgentId: created.externalAgentId,
    };
  }
}
