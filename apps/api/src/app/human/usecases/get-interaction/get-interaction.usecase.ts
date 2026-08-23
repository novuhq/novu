import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionSettlementService } from '../../../agents/human-relay/human-interaction-settlement.service';
import { toInteractionResponse, type InteractionResponseDto } from '../../dtos/interaction-response.dto';
import { GetInteractionCommand } from './get-interaction.command';

@Injectable()
export class GetInteraction {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetInteractionCommand): Promise<InteractionResponseDto> {
    return toInteractionResponse(await this.load(command));
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
