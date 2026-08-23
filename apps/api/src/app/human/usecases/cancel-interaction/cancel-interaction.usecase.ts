import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionStatusEnum } from '@novu/shared';
import { HumanInteractionSettlementService } from '../../../agents/human-relay/human-interaction-settlement.service';
import { toInteractionResponse, type InteractionResponseDto } from '../../dtos/interaction-response.dto';
import { CancelInteractionCommand } from './cancel-interaction.command';

@Injectable()
export class CancelInteraction {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService
  ) {}

  @InstrumentUsecase()
  async execute(command: CancelInteractionCommand): Promise<InteractionResponseDto> {
    const interaction = await this.humanInteractionRepository.findByIdentifier(
      command.environmentId,
      command.identifier
    );

    if (!interaction) {
      throw new NotFoundException(`Interaction "${command.identifier}" was not found.`);
    }

    // Align with get/list: overdue pending rows expire before cancel can claim them.
    const current = await this.settlement.expireIfOverdue(interaction);

    if (current.status !== HumanInteractionStatusEnum.PENDING) {
      // Cancel is idempotent on terminal states — return the row as-is.
      return toInteractionResponse(current);
    }

    const settled = await this.settlement.settle(current, HumanInteractionStatusEnum.CANCELED);

    if (settled) {
      return toInteractionResponse(settled);
    }

    // Lost the race to a click/expiry — return whatever won.
    const latest = await this.humanInteractionRepository.findByIdentifier(command.environmentId, command.identifier);

    return toInteractionResponse(latest ?? current);
  }
}
