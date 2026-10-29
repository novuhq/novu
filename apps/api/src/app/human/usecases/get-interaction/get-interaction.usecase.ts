import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionStatusEnum } from '@novu/shared';
import { HumanInteractionSettlementService } from '../../../agents/human-relay/human-interaction-settlement.service';
import { type InteractionResponseDto, toInteractionResponse } from '../../dtos/interaction-response.dto';
import { GetInteractionCommand } from './get-interaction.command';

/** How a person settles an interaction. Expired, canceled and delivered are the system's doing. */
const SETTLED_BY_A_PERSON: readonly string[] = [
  HumanInteractionStatusEnum.ANSWERED,
  HumanInteractionStatusEnum.APPROVED,
  HumanInteractionStatusEnum.DENIED,
];

@Injectable()
export class GetInteraction {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetInteractionCommand): Promise<InteractionResponseDto> {
    const interaction = await this.load(command);

    // Whoever waits for the answer asks for the interaction, so this read hands the agent a person's answer: the
    // listener leaves it out of the messages it gets, and the agent doesn't get it twice.
    if (SETTLED_BY_A_PERSON.includes(interaction.status) && !interaction.answerReadAt) {
      await this.humanInteractionRepository.markAnswerRead(
        command.environmentId,
        interaction._id,
        new Date().toISOString()
      );
    }

    // As it was before this read: the listener asks whether a command that waited got the answer already.
    return toInteractionResponse(interaction);
  }

  /** Shared loader: fetch + lazy expiry. Used by the wait long-poll too. */
  async load(command: GetInteractionCommand): Promise<HumanInteractionEntity> {
    const interaction = await this.humanInteractionRepository.findByIdentifier(
      command.environmentId,
      command.identifier
    );

    if (!interaction) {
      throw new NotFoundException(`Interaction "${command.identifier}" was not found.`);
    }

    return this.settlement.expireIfOverdue(interaction);
  }
}
