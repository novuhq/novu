import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, EnvironmentRepository } from '@novu/dal';
import { EnvironmentTypeEnum } from '@novu/shared';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { UpdateAgentCommand } from './update-agent.command';

@Injectable()
export class UpdateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: UpdateAgentCommand): Promise<AgentResponseDto> {
    const hasBehaviorFields =
      command.behavior?.thinkingIndicatorEnabled !== undefined ||
      command.behavior?.reactions?.onMessageReceived !== undefined ||
      command.behavior?.reactions?.onResolved !== undefined;

    const hasGeneralFields =
      command.name !== undefined ||
      command.description !== undefined ||
      command.active !== undefined ||
      hasBehaviorFields;
    const hasBridgeFields =
      command.bridgeUrl !== undefined ||
      command.devBridgeUrl !== undefined ||
      command.devBridgeActive !== undefined;

    if (!hasGeneralFields && !hasBridgeFields) {
      throw new BadRequestException('At least one field must be provided.');
    }

    if (command.devBridgeActive === true || (command.devBridgeUrl !== undefined && command.devBridgeUrl !== null)) {
      await this.assertNotProductionEnvironment(command.environmentId, command.organizationId);
    }

    const existing = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!existing) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    const $set: Record<string, string | boolean | null> = {};

    if (command.name !== undefined) {
      $set.name = command.name;
    }

    if (command.description !== undefined) {
      $set.description = command.description;
    }

    if (command.active !== undefined) {
      $set.active = command.active;
    }

    if (hasBehaviorFields) {
      if (command.behavior!.thinkingIndicatorEnabled !== undefined) {
        $set['behavior.thinkingIndicatorEnabled'] = command.behavior!.thinkingIndicatorEnabled;
      }

      if (command.behavior!.reactions !== undefined) {
        if (command.behavior!.reactions.onMessageReceived !== undefined) {
          $set['behavior.reactions.onMessageReceived'] = command.behavior!.reactions.onMessageReceived;
        }
        if (command.behavior!.reactions.onResolved !== undefined) {
          $set['behavior.reactions.onResolved'] = command.behavior!.reactions.onResolved;
        }
      }
    }

    if (command.bridgeUrl !== undefined) {
      $set.bridgeUrl = command.bridgeUrl;
    }

    if (command.devBridgeUrl !== undefined) {
      $set.devBridgeUrl = command.devBridgeUrl;
    }

    if (command.devBridgeActive !== undefined) {
      $set.devBridgeActive = command.devBridgeActive;
    }

    await this.agentRepository.updateOne(
      {
        _id: existing._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set }
    );

    const updated = await this.agentRepository.findById(
      {
        _id: existing._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!updated) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    return toAgentResponse(updated);
  }

  private async assertNotProductionEnvironment(environmentId: string, organizationId: string): Promise<void> {
    const environment = await this.environmentRepository.findOne(
      { _id: environmentId, _organizationId: organizationId },
      ['type', 'name']
    );

    if (environment?.type === EnvironmentTypeEnum.PROD) {
      throw new ForbiddenException('Dev bridge cannot be activated on production environments.');
    }
  }
}
