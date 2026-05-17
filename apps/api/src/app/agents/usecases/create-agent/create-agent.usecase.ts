import { BadRequestException, ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AnalyticsService, shortId, slugifyOrRandom } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { trackAgentCreated } from '../../agent-analytics';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
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
    private readonly provisionManagedAgentUsecase: ProvisionManagedAgent
  ) {}

  async execute(command: CreateAgentCommand): Promise<AgentResponseDto> {
    const isAdoptMode = command.runtime === 'managed' && !!command.managedRuntime?.externalAgentId;

    if (!isAdoptMode) {
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

      if (existing) {
        throw new ConflictException(
          `An agent with identifier "${command.identifier}" already exists in this environment.`
        );
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
            : (command.identifier ?? `${ADOPT_PLACEHOLDER}-${shortId(6)}`);

          const created = await this.agentRepository.create(
            {
              name: tempName,
              identifier: tempIdentifier,
              description: command.description,
              active: command.active ?? true,
              creationSource: command.creationSource,
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
          identifier: command.identifier ?? '',
          description: command.description,
          active: command.active ?? true,
          creationSource: command.creationSource,
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

    return toAgentResponse(updatedAgent ?? agent);
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
