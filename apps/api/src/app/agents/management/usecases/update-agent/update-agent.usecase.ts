import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { AgentEntity, AgentRepository, EnvironmentRepository } from '@novu/dal';
import { AgentSubscriberAccessEnum, EnvironmentTypeEnum } from '@novu/shared';
import {
  assertSafeOutboundUrl,
  resolvePublicAddresses,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import { SyncAgentEmailSenderName } from '../../../email/sync-agent-email-sender-name.service';
import { assertSubscriberTokensEnabled } from '../../../shared/assert-subscriber-tokens-enabled';
import type { AgentResponseDto, AgentRuntimeConfigResponseDto } from '../../../shared/dtos';
import { toAgentResponse } from '../../../shared/mappers/agent-response.mapper';
import { getAgentAccessRuleIssues } from '../../../shared/util/agent-access-rule';
import { GetAgentRuntimeConfigCommand } from '../get-agent-runtime-config/get-agent-runtime-config.command';
import { GetAgentRuntimeConfig } from '../get-agent-runtime-config/get-agent-runtime-config.usecase';
import { UpdateAgentCommand } from './update-agent.command';

@Injectable()
export class UpdateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly syncAgentEmailSenderName: SyncAgentEmailSenderName,
    private readonly getAgentRuntimeConfigUsecase: GetAgentRuntimeConfig,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: UpdateAgentCommand): Promise<AgentResponseDto> {
    const hasBehaviorFields =
      command.behavior?.acknowledgeOnReceived !== undefined ||
      command.behavior?.reactionOnResolved !== undefined ||
      command.behavior?.subscriberAccess !== undefined ||
      command.behavior?.accessRule !== undefined ||
      command.behavior?.replyPolicy !== undefined;

    const hasGeneralFields =
      command.name !== undefined ||
      command.description !== undefined ||
      command.active !== undefined ||
      hasBehaviorFields;
    const hasBridgeFields =
      command.bridgeUrl !== undefined || command.devBridgeUrl !== undefined || command.devBridgeActive !== undefined;

    if (!hasGeneralFields && !hasBridgeFields) {
      throw new BadRequestException('At least one field must be provided.');
    }

    const hasReadOnlyFields = command.name !== undefined || command.description !== undefined || hasBehaviorFields;

    if (hasReadOnlyFields) {
      await this.assertNotProduction(
        command.environmentId,
        command.organizationId,
        'Only the active status and bridge URL can be modified in production environments.'
      );
    }

    if (command.devBridgeActive !== undefined || command.devBridgeUrl !== undefined) {
      await this.assertNotProduction(
        command.environmentId,
        command.organizationId,
        'Dev bridge settings cannot be modified in production environments.'
      );
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

    if (existing.runtime === 'human_relay') {
      throw new ForbiddenException('System human-relay agents cannot be modified.');
    }

    await this.assertAccessRuleUpdate(command, existing);

    const { $set, $unset } = this.buildUpdateOps(command, existing);
    const update = Object.keys($unset).length > 0 ? { $set, $unset } : { $set };

    const newName = command.name;
    const agentQuery = {
      _id: existing._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    if (newName !== undefined && newName !== existing.name) {
      await this.agentRepository.withTransaction(async (session) => {
        if (Object.keys($set).length > 0) {
          await this.agentRepository.update(agentQuery, update, session ? { session } : {});
        }

        await this.syncAgentEmailSenderName.execute(
          { agentId: existing._id, environmentId: command.environmentId, organizationId: command.organizationId },
          newName,
          session
        );
      });
    } else if (Object.keys($set).length > 0) {
      await this.agentRepository.updateOne(agentQuery, update);
    }

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

    const runtimeConfig = await this.loadRuntimeConfig(updated, command);

    return toAgentResponse(updated, undefined, runtimeConfig);
  }

  private async assertAccessRuleUpdate(command: UpdateAgentCommand, existing: AgentEntity): Promise<void> {
    const requestsRuleAccess = command.behavior?.subscriberAccess === AgentSubscriberAccessEnum.RULE;
    const sendsAccessRule = command.behavior?.accessRule !== undefined;

    if (!requestsRuleAccess && !sendsAccessRule) {
      return;
    }

    await assertSubscriberTokensEnabled({
      featureFlagsService: this.featureFlagsService,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const effectiveAccess = command.behavior?.subscriberAccess ?? existing.behavior?.subscriberAccess;
    if (effectiveAccess !== AgentSubscriberAccessEnum.RULE) {
      throw new BadRequestException('accessRule requires subscriberAccess "rule"');
    }

    const issues = getAgentAccessRuleIssues(command.behavior?.accessRule ?? existing.behavior?.accessRule);
    if (issues.length > 0) {
      throw new BadRequestException(issues.join('; '));
    }
  }

  private buildUpdateOps(
    command: UpdateAgentCommand,
    existing: AgentEntity
  ): { $set: Record<string, unknown>; $unset: Record<string, 1> } {
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

    const behavior = command.behavior;

    if (behavior) {
      if (behavior.acknowledgeOnReceived !== undefined) {
        $set['behavior.acknowledgeOnReceived'] = behavior.acknowledgeOnReceived;
      }
      if (behavior.reactionOnResolved !== undefined) {
        $set['behavior.reactionOnResolved'] = behavior.reactionOnResolved;
      }
      if (behavior.subscriberAccess !== undefined) {
        $set['behavior.subscriberAccess'] = behavior.subscriberAccess;
      }
      if (behavior.accessRule !== undefined) {
        $set['behavior.accessRule'] = behavior.accessRule;
      }
      if (behavior.replyPolicy !== undefined) {
        $set['behavior.replyPolicy'] = behavior.replyPolicy;
      }
    }

    const effectiveAccess = command.behavior?.subscriberAccess ?? existing.behavior?.subscriberAccess;
    if (
      existing.behavior?.subscriberAccess === AgentSubscriberAccessEnum.RULE &&
      effectiveAccess !== AgentSubscriberAccessEnum.RULE
    ) {
      $unset['behavior.accessRule'] = 1;
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

    return { $set, $unset };
  }

  private async loadRuntimeConfig(
    agent: { runtime?: string; identifier: string },
    command: UpdateAgentCommand
  ): Promise<AgentRuntimeConfigResponseDto | undefined> {
    if (agent.runtime !== 'managed') {
      return undefined;
    }

    try {
      const config = await this.getAgentRuntimeConfigUsecase.execute(
        GetAgentRuntimeConfigCommand.create({
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          identifier: agent.identifier,
        })
      );

      return config;
    } catch (err) {
      this.logger.warn(
        { err, agentIdentifier: agent.identifier },
        'Failed to load managed-runtime runtime config after UpdateAgent; returning agent without runtime config.'
      );

      return undefined;
    }
  }

  private async assertNotProduction(environmentId: string, organizationId: string, message: string): Promise<void> {
    const environment = await this.environmentRepository.findOne(
      { _id: environmentId, _organizationId: organizationId },
      ['type', 'name']
    );

    if (environment?.type === EnvironmentTypeEnum.PROD) {
      throw new ForbiddenException(message);
    }
  }

  private async assertSafeBridgeUrl(url: string | undefined | null, field: string): Promise<void> {
    if (!url) {
      return;
    }

    try {
      const parsed = assertSafeOutboundUrl(url);
      await resolvePublicAddresses(parsed.hostname);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new BadRequestException(`${field}: ${err.message}`);
      }
      throw err;
    }
  }
}
