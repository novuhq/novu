import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentEntity, AgentRepository, HumanInteractionRepository } from '@novu/dal';
import { normalizeHumanTo } from '@novu/shared';
import { type InteractionResponseDto, toInteractionResponse } from '../../dtos/interaction-response.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import {
  assertHumanChooseOptions,
  assertHumanPendingCap,
  buildPendingHumanInteraction,
  deliverToTargets,
  type HumanDeliveryTarget,
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
    const subscriberIds = normalizeHumanTo(command.to);
    const primarySubscriberId = subscriberIds[0];
    if (!primarySubscriberId) {
      throw new BadRequestException('`to` must include at least one subscriberId');
    }

    await assertHumanPendingCap(this.humanInteractionRepository, {
      environmentId: command.environmentId,
      subscriberIds,
      kind: command.kind,
      errorMessage: (pendingCount, cap, subscriberId) =>
        `Human "${subscriberId}" already has ${pendingCount} pending interactions (cap ${cap}). Wait for answers or cancel stale ones with \`human list\`.`,
    });

    const resolved = await Promise.all(
      subscriberIds.map(async (subscriberId) => ({
        subscriberId,
        target: await this.deliveryService.resolveChannel({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentId: agent._id,
          subscriberId,
          via: command.via,
        }),
      }))
    );

    const [primaryTarget] = resolved;
    if (!primaryTarget) {
      throw new BadRequestException('`to` must include at least one subscriberId');
    }

    const interaction = await this.humanInteractionRepository.create(
      buildPendingHumanInteraction({
        kind: command.kind,
        prompt: command.prompt,
        options: command.options,
        from: command.from,
        subscriberId: primarySubscriberId,
        subscriberIds,
        agentId: agent._id,
        integrationIdentifier: primaryTarget.target.integrationIdentifier,
        platform: primaryTarget.target.platform,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        ttlSeconds: command.ttlSeconds,
      })
    );

    const targets: HumanDeliveryTarget[] = resolved.map(({ subscriberId, target }) => ({
      subscriberId,
      integrationIdentifier: target.integrationIdentifier,
      platform: target.platform,
      deliver: () => this.deliveryService.deliver(interaction, target),
    }));

    const delivered = await deliverToTargets(this.humanInteractionRepository, this.logger, interaction, targets, {
      logMessage: 'Human interaction delivery failed for one recipient',
    });

    return toInteractionResponse(delivered.interaction, delivered.failedSubscriberIds);
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
