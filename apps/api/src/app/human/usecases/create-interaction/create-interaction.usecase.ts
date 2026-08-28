import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentEntity, AgentRepository, HumanInteractionRepository } from '@novu/dal';
import { type InteractionResponseDto, toInteractionResponse } from '../../dtos/interaction-response.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import {
  assertHumanChooseOptions,
  assertHumanPendingCap,
  buildPendingHumanInteraction,
  deliverHumanInteractionOrRollback,
} from '../../services/human-interaction-lifecycle';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { CreateInteractionCommand } from './create-interaction.command';

@Injectable()
export class CreateInteraction {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly agentRepository: AgentRepository,
    private readonly deliveryService: HumanDeliveryService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateInteractionCommand): Promise<InteractionResponseDto> {
    assertHumanChooseOptions(command.kind, command.options);

    const agent = await this.resolveAgent(command);

    await assertHumanPendingCap(this.humanInteractionRepository, {
      environmentId: command.environmentId,
      subscriberId: command.to,
      kind: command.kind,
      errorMessage: (pendingCount, cap) =>
        `Human "${command.to}" already has ${pendingCount} pending interactions (cap ${cap}). Wait for answers or cancel stale ones with \`human list\`.`,
    });

    const target = await this.deliveryService.resolveChannel({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      subscriberId: command.to,
      via: command.via,
    });

    const interaction = await this.humanInteractionRepository.create(
      buildPendingHumanInteraction({
        kind: command.kind,
        prompt: command.prompt,
        options: command.options,
        from: command.from,
        subscriberId: command.to,
        agentId: agent._id,
        integrationIdentifier: target.integrationIdentifier,
        platform: target.platform,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        ttlSeconds: command.ttlSeconds,
      })
    );

    const delivered = await deliverHumanInteractionOrRollback(
      this.humanInteractionRepository,
      this.logger,
      interaction,
      () => this.deliveryService.deliver(interaction, target),
      {
        logMessage: 'Human interaction delivery failed',
        logContext: { platform: interaction.platform },
        failMessage: (err) =>
          `Failed to deliver to ${interaction.platform}: ${err instanceof Error ? err.message : 'unknown error'}`,
      }
    );

    return toInteractionResponse(delivered);
  }

  private async resolveAgent(command: CreateInteractionCommand): Promise<AgentEntity> {
    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;

    const agent = await this.agentRepository.findOne(
      {
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      if (identifier === DEFAULT_HUMAN_RELAY_IDENTIFIER) {
        throw new NotFoundException(`Relay agent "${identifier}" was not found. Run \`human setup\` first.`);
      }

      throw new NotFoundException(`Agent "${identifier}" was not found.`);
    }

    return agent;
  }
}
