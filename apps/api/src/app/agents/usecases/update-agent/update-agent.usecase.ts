import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, validateUrlSsrf } from '@novu/application-generic';
import { AgentRepository, AgentRuntimeEnum, EnvironmentRepository } from '@novu/dal';
import { EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { UpdateAgentCommand } from './update-agent.command';

@Injectable()
export class UpdateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

  async execute(command: UpdateAgentCommand): Promise<AgentResponseDto> {
    const hasBehaviorFields =
      command.behavior?.acknowledgeOnReceived !== undefined || command.behavior?.reactionOnResolved !== undefined;

    const hasGeneralFields =
      command.name !== undefined ||
      command.description !== undefined ||
      command.active !== undefined ||
      command.runtime !== undefined ||
      command.managedRuntime !== undefined ||
      hasBehaviorFields;
    const hasBridgeFields =
      command.bridgeUrl !== undefined || command.devBridgeUrl !== undefined || command.devBridgeActive !== undefined;

    if (!hasGeneralFields && !hasBridgeFields) {
      throw new BadRequestException('At least one field must be provided.');
    }

    if (command.devBridgeActive === true || (command.devBridgeUrl !== undefined && command.devBridgeUrl !== null)) {
      await this.assertNotProductionEnvironment(command.environmentId, command.organizationId);
    }

    // The bridge executor `fetch()`s these URLs from inside the API process on every
    // inbound chat event with a Novu HMAC and sensitive payload (subscriber + history).
    // Without an SSRF guard, an authenticated AGENT_WRITE caller can repoint the bridge
    // at internal hosts (loopback, RFC1918, link-local 169.254.169.254, cloud metadata).
    await this.assertSafeBridgeUrl(command.bridgeUrl, 'bridgeUrl');
    await this.assertSafeBridgeUrl(command.devBridgeUrl, 'devBridgeUrl');

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

    await this.assertRuntimeAllowed(command, existing.runtime ?? AgentRuntimeEnum.BRIDGE);

    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};

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
      if (command.behavior?.acknowledgeOnReceived !== undefined) {
        $set['behavior.acknowledgeOnReceived'] = command.behavior.acknowledgeOnReceived;
      }
      if (command.behavior?.reactionOnResolved !== undefined) {
        $set['behavior.reactionOnResolved'] = command.behavior.reactionOnResolved;
      }
    }

    if (command.runtime !== undefined) {
      $set.runtime = command.runtime;
      if (command.runtime === AgentRuntimeEnum.BRIDGE) {
        $unset.managedRuntime = 1;
      }
    }

    if (command.managedRuntime !== undefined) {
      $set.managedRuntime = command.managedRuntime;
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
      { $set, ...(Object.keys($unset).length ? { $unset } : {}) }
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

  private async assertSafeBridgeUrl(url: string | undefined | null, field: string): Promise<void> {
    if (!url) {
      return;
    }

    const ssrfError = await validateUrlSsrf(url);
    if (ssrfError) {
      throw new BadRequestException(`${field}: ${ssrfError}`);
    }
  }

  private async assertRuntimeAllowed(command: UpdateAgentCommand, currentRuntime: AgentRuntimeEnum): Promise<void> {
    const nextRuntime = command.runtime ?? currentRuntime;
    if (nextRuntime !== AgentRuntimeEnum.CLAUDE_MANAGED) {
      return;
    }

    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CLAUDE_MANAGED_AGENTS_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
    });

    if (!isEnabled) {
      throw new ForbiddenException('Claude Managed Agents are not enabled for this environment.');
    }

    if (command.runtime === AgentRuntimeEnum.CLAUDE_MANAGED && !command.managedRuntime) {
      throw new BadRequestException('managedRuntime is required when switching to Claude Managed Agents.');
    }

    if (command.managedRuntime && (!command.managedRuntime.agentId || !command.managedRuntime.environmentId)) {
      throw new BadRequestException('managedRuntime.agentId and managedRuntime.environmentId are required.');
    }
  }
}
