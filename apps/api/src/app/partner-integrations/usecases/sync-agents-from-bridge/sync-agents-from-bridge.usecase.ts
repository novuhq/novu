import { Injectable } from '@nestjs/common';
import { ExecuteBridgeRequest, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { DiscoverOutput, GetActionEnum, ResourceOriginEnum } from '@novu/framework/internal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { CreateAgentCommand } from '../../../agents/management/usecases/create-agent/create-agent.command';
import { CreateAgent } from '../../../agents/management/usecases/create-agent/create-agent.usecase';
import { UpdateAgentCommand } from '../../../agents/management/usecases/update-agent/update-agent.command';
import { UpdateAgent } from '../../../agents/management/usecases/update-agent/update-agent.usecase';
import { SyncAgentsFromBridgeCommand } from './sync-agents-from-bridge.command';

@Injectable()
export class SyncAgentsFromBridge {
  constructor(
    private readonly executeBridgeRequest: ExecuteBridgeRequest,
    private readonly agentRepository: AgentRepository,
    private readonly createAgent: CreateAgent,
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

    const discover = await this.discoverAgents(command);

    if (!discover?.agents?.length) {
      return;
    }

    for (const agent of discover.agents) {
      await this.syncAgentBridge(command, agent);
    }
  }

  private async discoverAgents(command: SyncAgentsFromBridgeCommand): Promise<DiscoverOutput | null> {
    try {
      return (await this.executeBridgeRequest.execute({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        statelessBridgeUrl: command.bridgeUrl,
        action: GetActionEnum.DISCOVER,
        retriesLimit: 1,
        workflowOrigin: ResourceOriginEnum.EXTERNAL,
        enforceSsrfProtection: true,
      })) as DiscoverOutput;
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          bridgeUrl: command.bridgeUrl,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        },
        'Could not discover agents from Vercel bridge URL'
      );

      return null;
    }
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
      await this.createAgent.execute(
        CreateAgentCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          name: agent.name ?? agent.agentId,
          identifier: agent.agentId,
          description: agent.description,
        })
      );

      existing = await this.agentRepository.findOne(
        {
          identifier: agent.agentId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        '*'
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
