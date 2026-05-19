import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  AnalyticsService,
  isAgentSharedInboxEnabled,
  PinoLogger,
  shortId,
  slugifyOrRandom,
} from '@novu/application-generic';
import { AgentRepository, CommunityOrganizationRepository, EnvironmentRepository } from '@novu/dal';
import { ApiServiceLevelEnum, EnvironmentTypeEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { trackAgentCreated } from '../../agent-analytics';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { FindOrCreateNovuEmail } from '../find-or-create-novu-email/find-or-create-novu-email.usecase';
import { ProvisionManagedAgentCommand } from '../provision-managed-agent/provision-managed-agent.command';
import { ProvisionManagedAgent } from '../provision-managed-agent/provision-managed-agent.usecase';
import { CreateAgentCommand } from './create-agent.command';

/** Temporary placeholder used for the initial Mongo insert in adopt mode. */
const ADOPT_PLACEHOLDER = '__adopt_pending__';

@Injectable()
export class CreateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly provisionManagedAgentUsecase: ProvisionManagedAgent,
    private readonly findOrCreateNovuEmail: FindOrCreateNovuEmail,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: CreateAgentCommand): Promise<AgentResponseDto> {
    const isAdoptMode = command.runtime === 'managed' && !!command.managedRuntime?.externalAgentId;
    let identifier = command.identifier;

    if (!isAdoptMode) {
      if (!command.name) {
        throw new BadRequestException('name is required when not adopting an existing managed agent.');
      }
      if (!identifier) {
        throw new BadRequestException('identifier is required when not adopting an existing managed agent.');
      }

      const existing = await this.agentRepository.findOne(
        {
          identifier: identifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        ['_id']
      );

      if (existing) {
        identifier = `${identifier}-${shortId()}`;
      }
    }

    if (command.runtime === 'managed' && !command.managedRuntime) {
      throw new UnprocessableEntityException('managedRuntime is required when runtime is "managed".');
    }

    const isManaged = command.runtime === 'managed';

    const agent = isManaged
      ? await this.agentRepository.withTransaction(async (session) => {
          const managedRuntime = command.managedRuntime!;

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
              _environmentId: command.environmentId,
              _organizationId: command.organizationId,
            },
            { session }
          );

          try {
            const provisionResult = await this.provisionManagedAgentUsecase.execute(
              Object.assign(new ProvisionManagedAgentCommand(), {
                agentId: created._id,
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

            if (isAdoptMode && !provisionResult.adoptedName) {
              throw new Error(
                `Provider returned no name for adopted agent "${command.managedRuntime?.externalAgentId}". Cannot resolve a unique identifier.`
              );
            }

            if (isAdoptMode && provisionResult.adoptedName) {
              // Resolve a unique identifier from the Claude agent name, following the
              // same pattern used elsewhere in the platform: slugify + random short ID on collision.
              const resolvedIdentifier = await this.resolveUniqueIdentifier(
                provisionResult.adoptedName,
                command.environmentId,
                command.organizationId,
                created._id
              );

              await this.agentRepository.update(
                {
                  _id: created._id,
                  _environmentId: command.environmentId,
                  _organizationId: command.organizationId,
                },
                {
                  $set: {
                    name: provisionResult.adoptedName,
                    identifier: resolvedIdentifier,
                  },
                },
                session ? { session } : {}
              );
            }
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
        })
      : await this.agentRepository.create({
          name: command.name ?? '',
          identifier: identifier ?? '',
          description: command.description,
          active: command.active ?? true,
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
    });

    await this.autoProvisionDefaultEmailInbox(agent._id, command.environmentId, command.organizationId);

    return toAgentResponse(updatedAgent ?? agent);
  }

  /**
   * Auto-provision the agent's default NovuAgent email integration so the
   * dashboard EMAIL INBOX card has something to render the moment the agent
   * is created. Reuses `FindOrCreateNovuEmail` (idempotent).
   *
   * Gates:
   *   - cloud only (NOVU_ENTERPRISE + non self-hosted + shared inbound domain configured)
   *   - non-production environment (mirrors AddAgentIntegration's existing
   *     restriction; manual attach in production is also blocked today)
   *   - AGENT_EMAIL_INTEGRATION tier feature flag
   *
   * On any failure (tier, transient DB error, etc.) we log and continue - the
   * agent itself was created successfully and email can be wired up later.
   */
  private async autoProvisionDefaultEmailInbox(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<void> {
    if (!isAgentSharedInboxEnabled()) return;

    try {
      const environment = await this.environmentRepository.findOne(
        { _id: environmentId, _organizationId: organizationId },
        ['type']
      );
      if (!environment || environment.type === EnvironmentTypeEnum.PROD) {
        return;
      }

      const organization = await this.organizationRepository.findById(organizationId);
      const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;
      if (!getFeatureForTierAsBoolean(FeatureNameEnum.AGENT_EMAIL_INTEGRATION, tier)) {
        return;
      }

      await this.findOrCreateNovuEmail.execute(agentId, environmentId, organizationId);
    } catch (err) {
      this.logger.warn(
        { err, agentId, environmentId, organizationId },
        'Failed to auto-provision NovuAgent email integration at agent creation'
      );
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
