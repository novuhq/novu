import { BadGatewayException, BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, shortId } from '@novu/application-generic';
import { AgentEntity, AgentRepository, HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import {
  HUMAN_INTERACTION_DEFAULT_TTL_SECONDS,
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
} from '@novu/shared';
import { toInteractionResponse, type InteractionResponseDto } from '../../dtos/interaction-response.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { CreateInteractionCommand } from './create-interaction.command';

const DEFAULT_PENDING_CAP = 25;

function resolvePendingCap(): number {
  const parsed = Number(process.env.HUMAN_PENDING_CAP);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PENDING_CAP;
}

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
    if (command.kind === HumanInteractionKindEnum.CHOOSE && !command.options?.length) {
      throw new BadRequestException('`choose` interactions require at least two options.');
    }

    const agent = await this.resolveRelayAgent(command);

    if (command.kind !== HumanInteractionKindEnum.TELL) {
      const pendingCount = await this.humanInteractionRepository.countPendingForSubscriber(
        command.environmentId,
        command.to
      );
      const cap = resolvePendingCap();

      if (pendingCount >= cap) {
        throw new HttpException(
          `Human "${command.to}" already has ${pendingCount} pending interactions (cap ${cap}). Wait for answers or cancel stale ones with \`human list\`.`,
          429
        );
      }
    }

    const target = await this.deliveryService.resolveTarget({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.to,
      integrationIdentifier: command.integrationIdentifier,
    });

    const ttlSeconds = command.ttlSeconds ?? HUMAN_INTERACTION_DEFAULT_TTL_SECONDS;

    const interaction = await this.humanInteractionRepository.create({
      identifier: `hi_${shortId(12)}`,
      kind: command.kind,
      status: HumanInteractionStatusEnum.PENDING,
      prompt: command.prompt,
      ...(command.kind === HumanInteractionKindEnum.CHOOSE && command.options
        ? { options: command.options.map((label, index) => ({ id: `opt_${index + 1}`, label })) }
        : {}),
      ...(command.from ? { fromLabel: command.from } : {}),
      subscriberId: command.to,
      _agentId: agent._id,
      integrationIdentifier: command.integrationIdentifier,
      platform: target.platform,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    const delivered = await this.deliverOrRollback(interaction, target);

    return toInteractionResponse(delivered);
  }

  private async deliverOrRollback(
    interaction: HumanInteractionEntity,
    target: Awaited<ReturnType<HumanDeliveryService['resolveTarget']>>
  ): Promise<HumanInteractionEntity> {
    let deliveryRefs: Awaited<ReturnType<HumanDeliveryService['deliver']>> | null = null;

    try {
      deliveryRefs = await this.deliveryService.deliver(interaction, target);
      await this.humanInteractionRepository.stampDelivery(interaction._environmentId, interaction._id, deliveryRefs);

      if (interaction.kind === HumanInteractionKindEnum.TELL) {
        // `tell` has nothing to wait on — flip straight to its terminal state.
        const settled = await this.humanInteractionRepository.settleIfPending(
          interaction._environmentId,
          interaction._id,
          HumanInteractionStatusEnum.DELIVERED
        );

        return settled ?? { ...interaction, ...deliveryRefs, status: HumanInteractionStatusEnum.DELIVERED };
      }

      return { ...interaction, ...deliveryRefs };
    } catch (err) {
      if (!deliveryRefs) {
        // Never reached the platform — remove the row so it can't be answered or listed.
        await this.humanInteractionRepository
          .delete({ _id: interaction._id, _environmentId: interaction._environmentId })
          .catch(() => undefined);
      } else {
        // Card is already live. Keep the row and best-effort stamp refs so clicks
        // can still settle instead of orphaning a message for a deleted interaction.
        await this.humanInteractionRepository
          .stampDelivery(interaction._environmentId, interaction._id, deliveryRefs)
          .catch(() => undefined);
      }

      this.logger.warn(
        {
          err,
          interactionIdentifier: interaction.identifier,
          platform: interaction.platform,
          delivered: Boolean(deliveryRefs),
        },
        'Human interaction delivery failed'
      );

      throw new BadGatewayException(
        `Failed to deliver to ${interaction.platform}: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    }
  }

  private async resolveRelayAgent(command: CreateInteractionCommand): Promise<AgentEntity> {
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
      throw new NotFoundException(`Relay agent "${identifier}" was not found. Run \`human setup\` first.`);
    }

    if (agent.runtime !== 'human_relay') {
      throw new BadRequestException(
        `Agent "${identifier}" is not a human-relay agent — pick a different identifier for human interactions.`
      );
    }

    return agent;
  }
}
