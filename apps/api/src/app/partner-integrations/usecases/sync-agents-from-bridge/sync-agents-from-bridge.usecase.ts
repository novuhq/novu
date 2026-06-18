import { Injectable } from '@nestjs/common';
import { ExecuteBridgeRequest, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { DiscoverOutput, GetActionEnum } from '@novu/framework/internal';
import { FeatureFlagsKeysEnum, ResourceOriginEnum } from '@novu/shared';
import { RegisterDiscoveredAgentCommand } from '../../../agents/management/usecases/register-discovered-agent/register-discovered-agent.command';
import { RegisterDiscoveredAgent } from '../../../agents/management/usecases/register-discovered-agent/register-discovered-agent.usecase';
import { UpdateAgentCommand } from '../../../agents/management/usecases/update-agent/update-agent.command';
import { UpdateAgent } from '../../../agents/management/usecases/update-agent/update-agent.usecase';
import { SyncAgentsFromBridgeCommand } from './sync-agents-from-bridge.command';

@Injectable()
export class SyncAgentsFromBridge {
  constructor(
    private readonly executeBridgeRequest: ExecuteBridgeRequest,
    private readonly agentRepository: AgentRepository,
    private readonly registerDiscoveredAgent: RegisterDiscoveredAgent,
    private readonly updateAgent: UpdateAgent,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: SyncAgentsFromBridgeCommand): Promise<void> {
    const isAgentsEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED,
      defaultValue: process.env.IS_CONVERSATIONAL_AGENTS_ENABLED === 'true',
      organization: { _id: command.organizationId },
      environment: { _id: command.environmentId },
    });

    if (!isAgentsEnabled) {
      return;
    }

    const discover = command.discoverResult ?? (await this.discoverAgents(command));

    if (!discover?.agents?.length) {
      return;
    }

    await Promise.all(discover.agents.map((agent) => this.syncAgentBridge(command, agent)));
  }

  private async discoverAgents(command: SyncAgentsFromBridgeCommand): Promise<DiscoverOutput> {
    const discover = (await this.executeBridgeRequest.execute({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      statelessBridgeUrl: command.bridgeUrl,
      action: GetActionEnum.DISCOVER,
      retriesLimit: 1,
      workflowOrigin: ResourceOriginEnum.EXTERNAL,
      enforceSsrfProtection: true,
    })) as DiscoverOutput;

    return discover;
  }

  private async syncAgentBridge(
    command: SyncAgentsFromBridgeCommand,
    agent: { agentId: string; name?: string; description?: string }
  ): Promise<void> {
    let existing = await this.agentRepository.findOne(
      {
        identifier: agent.agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!existing && command.isProduction) {
      existing = await this.registerDiscoveredAgent.execute(
        RegisterDiscoveredAgentCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          name: agent.name ?? agent.agentId,
          identifier: agent.agentId,
          description: agent.description,
        })
      );
    }

    if (!existing) {
      return;
    }

    if (command.isProduction) {
      if (existing.bridgeUrl === command.bridgeUrl) {
        return;
      }

      await this.updateAgent.execute(
        UpdateAgentCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          identifier: agent.agentId,
          bridgeUrl: command.bridgeUrl,
        })
      );

      return;
    }

    if (existing.devBridgeUrl === command.bridgeUrl && existing.devBridgeActive) {
      return;
    }

    await this.updateAgent.execute(
      UpdateAgentCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        identifier: agent.agentId,
        devBridgeUrl: command.bridgeUrl,
        devBridgeActive: true,
      })
    );
  }
}
