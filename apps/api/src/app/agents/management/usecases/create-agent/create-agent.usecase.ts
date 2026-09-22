import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  AgentEntitlementsService,
  AnalyticsService,
  PinoLogger,
  shortId,
  slugifyOrRandom,
  throwPlanLimitExceeded,
} from '@novu/application-generic';
import { AgentEntity, AgentRepository } from '@novu/dal';
import { AGENT_NAME_MAX_LENGTH, AgentReplyPolicyEnum, AgentSubscriberAccessEnum } from '@novu/shared';
import type { ClientSession } from 'mongoose';
import { KeylessAbuseGuardService } from '../../../../keyless/keyless-abuse-guard.service';
import { trackAgentCreated } from '../../../shared/analytics/agent-analytics';
import type { AgentResponseDto, AgentRuntimeConfigResponseDto } from '../../../shared/dtos';
import { toAgentResponse } from '../../../shared/mappers/agent-response.mapper';
import { GetAgentRuntimeConfigCommand } from '../get-agent-runtime-config/get-agent-runtime-config.command';
import { GetAgentRuntimeConfig } from '../get-agent-runtime-config/get-agent-runtime-config.usecase';
import { ProvisionManagedAgentCommand } from '../provision-managed-agent/provision-managed-agent.command';
import { ProvisionManagedAgent } from '../provision-managed-agent/provision-managed-agent.usecase';
import { CreateAgentCommand } from './create-agent.command';

/** Temporary placeholder used for the initial Mongo insert in adopt mode. */
const ADOPT_PLACEHOLDER = '__adopt_pending__';

function defaultCreateBehavior(isManaged: boolean) {
  return {
    subscriberAccess: isManaged ? AgentSubscriberAccessEnum.OPEN : AgentSubscriberAccessEnum.RESTRICTED,
    replyPolicy: AgentReplyPolicyEnum.SMART,
  };
}

@Injectable()
export class CreateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly provisionManagedAgentUsecase: ProvisionManagedAgent,
    private readonly getAgentRuntimeConfigUsecase: GetAgentRuntimeConfig,
    private readonly logger: PinoLogger,
    private readonly keylessAbuseGuard: KeylessAbuseGuardService,
    private readonly agentEntitlementsService: AgentEntitlementsService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: CreateAgentCommand): Promise<AgentResponseDto> {
    await this.assertCreationWithinLimit(command.organizationId, command.environmentId);

    const isAdoptMode = command.runtime === 'managed' && Boolean(command.managedRuntime?.externalAgentId);
    const identifier = await this.resolveCreateIdentifier(command, isAdoptMode);

    if (command.runtime === 'managed' && !command.managedRuntime) {
      throw new UnprocessableEntityException('managedRuntime is required when runtime is "managed".');
    }

    const isManaged = command.runtime === 'managed';
    const behavior = defaultCreateBehavior(isManaged);

    if (isManaged) {
      await this.keylessAbuseGuard.assertKeylessAiEnabled(command.organizationId);
    }

    const agent = isManaged
      ? await this.createManagedAgent(command, identifier, isAdoptMode, behavior)
      : await this.agentRepository.create({
          name: command.name ?? '',
          identifier: identifier ?? '',
          description: command.description,
          active: command.active ?? true,
          behavior,
          ...(command.analyticsSource ? { creationSource: command.analyticsSource } : {}),
          createdBy: command.userId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        });

    const updatedAgent = await this.agentRepository.findOne(
      {
        _id: agent._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    trackAgentCreated(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: (updatedAgent ?? agent).identifier,
      active: agent.active ?? true,
      name: (updatedAgent ?? agent).name,
      source: command.analyticsSource,
      runtime: command.runtime,
    });

    const runtimeConfig = await this.loadRuntimeConfig(updatedAgent ?? agent, command);

    return toAgentResponse(updatedAgent ?? agent, undefined, runtimeConfig);
  }

  private async resolveCreateIdentifier(
    command: CreateAgentCommand,
    isAdoptMode: boolean
  ): Promise<string | undefined> {
    if (isAdoptMode) {
      return command.identifier;
    }

    if (!command.name) {
      throw new BadRequestException('name is required when not adopting an existing managed agent.');
    }

    if (!command.identifier) {
      throw new BadRequestException('identifier is required when not adopting an existing managed agent.');
    }

    const existing = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!existing) {
      return command.identifier;
    }

    return `${command.identifier}-${shortId()}`;
  }

  private async createManagedAgent(
    command: CreateAgentCommand,
    identifier: string | undefined,
    isAdoptMode: boolean,
    behavior: ReturnType<typeof defaultCreateBehavior>
  ): Promise<AgentEntity> {
    return this.agentRepository.withTransaction(async (session) => {
      await this.keylessAbuseGuard.assertManagedAgentCap(command.environmentId, command.organizationId);

      const managedRuntime = command.managedRuntime;
      if (!managedRuntime) {
        throw new UnprocessableEntityException('managedRuntime is required when runtime is "managed".');
      }

      // In adopt mode we don't know the name/identifier yet — use temporary placeholders.
      // They will be overwritten after the provider responds.
      const tempName = isAdoptMode ? ADOPT_PLACEHOLDER : (command.name ?? ADOPT_PLACEHOLDER);
      const tempIdentifier = isAdoptMode
        ? `${ADOPT_PLACEHOLDER}-${shortId(6)}`
        : (identifier ?? `${ADOPT_PLACEHOLDER}-${shortId(6)}`);

      const created = await this.agentRepository.create(
        {
          name: tempName,
          identifier: tempIdentifier,
          description: command.description,
          active: command.active ?? true,
          behavior,
          ...(command.analyticsSource ? { creationSource: command.analyticsSource } : {}),
          createdBy: command.userId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );

      try {
        await this.provisionManagedAgent(command, created._id, managedRuntime, isAdoptMode, session);
      } catch (provisionError) {
        // When running without a replica set (e.g. local dev), the transaction does not
        // auto-abort on throw, so we delete the agent we just inserted as a compensating action.
        if (!session) {
          await this.agentRepository.delete({
            _id: created._id,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          });
        }
        throw provisionError;
      }

      return created;
    });
  }

  private async provisionManagedAgent(
    command: CreateAgentCommand,
    agentId: string,
    managedRuntime: NonNullable<CreateAgentCommand['managedRuntime']>,
    isAdoptMode: boolean,
    session: ClientSession | null
  ): Promise<void> {
    const provisionResult = await this.provisionManagedAgentUsecase.execute(
      Object.assign(new ProvisionManagedAgentCommand(), {
        agentId,
        name: command.name,
        externalEnvironmentId: managedRuntime.externalEnvironmentId,
        externalAgentId: managedRuntime.externalAgentId,
        providerId: managedRuntime.providerId,
        integrationId: managedRuntime.integrationId,
        model: managedRuntime.model,
        systemPrompt: managedRuntime.systemPrompt,
        tools: managedRuntime.tools,
        mcpServers: managedRuntime.mcpServers,
        skills: managedRuntime.skills,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }),
      { session }
    );

    if (!isAdoptMode) {
      return;
    }

    if (!provisionResult.adoptedName) {
      throw new Error(
        `Provider returned no name for adopted agent "${managedRuntime.externalAgentId}". Cannot resolve a unique identifier.`
      );
    }

    // Externally-sourced provider names may exceed our limit. Truncate
    // instead of rejecting so adopting a long-named provider agent never fails.
    const adoptedName = provisionResult.adoptedName.slice(0, AGENT_NAME_MAX_LENGTH);

    // Resolve a unique identifier from the Claude agent name, following the
    // same pattern used elsewhere in the platform: slugify + random short ID on collision.
    const resolvedIdentifier = await this.resolveUniqueIdentifier(
      adoptedName,
      command.environmentId,
      command.organizationId,
      agentId
    );

    await this.agentRepository.update(
      {
        _id: agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        $set: {
          name: adoptedName,
          identifier: resolvedIdentifier,
        },
      },
      session ? { session } : {}
    );
  }

  /**
   * Hard creation cap. Unlike the runtime plan limit (which soft-blocks
   * over-limit agents), this rejects the request outright:
   *   - plan-limited orgs may create up to plan limit + grace buffer (402);
   *   - the system limit (or a per-org LD override) is an absolute ceiling
   *     that upgrading cannot lift (409 — contact the Novu team).
   */
  private async assertCreationWithinLimit(organizationId: string, environmentId: string): Promise<void> {
    const allowance = await this.agentEntitlementsService.canCreateAgent(organizationId, environmentId);

    if (allowance.allowed) {
      return;
    }

    throwPlanLimitExceeded({
      resource: 'agents',
      limitSource: allowance.limitSource,
      limit: allowance.creationLimit,
      currentCount: allowance.totalCreated,
      planMessage:
        `You have reached the maximum number of agents that can be created on your plan (${allowance.creationLimit}). ` +
        'Upgrade your plan to create more agents.',
    });
  }

  private async loadRuntimeConfig(
    agent: { runtime?: string; identifier: string },
    command: CreateAgentCommand
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
        'Failed to load managed-runtime runtime config after CreateAgent; returning agent without runtime config.'
      );

      return undefined;
    }
  }

  /**
   * Resolves a unique slug identifier from a name.
   * Uses the platform-standard slugifyOrRandom pattern, then appends a short ID suffix
   * on collision (same approach as workflow/layout identifier generation).
   */
  private async resolveUniqueIdentifier(
    name: string,
    environmentId: string,
    organizationId: string,
    excludeAgentId: string
  ): Promise<string> {
    const base = slugifyOrRandom(name);

    const collision = await this.agentRepository.findOne(
      {
        identifier: base,
        _environmentId: environmentId,
        _organizationId: organizationId,
        _id: { $ne: excludeAgentId },
      },
      ['_id']
    );

    if (!collision) {
      return base;
    }

    return `${base}-${shortId(4)}`;
  }
}
