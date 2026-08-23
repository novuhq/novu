import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionSettlementService } from '../../../agents/human-relay/human-interaction-settlement.service';
import { toInteractionResponse, type InteractionResponseDto } from '../../dtos/interaction-response.dto';
import { ListInteractionsCommand } from './list-interactions.command';

@Injectable()
export class ListInteractions {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService
  ) {}

  @InstrumentUsecase()
  async execute(command: ListInteractionsCommand): Promise<{ data: InteractionResponseDto[] }> {
    const interactions = await this.humanInteractionRepository.listInteractions({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.to,
      status: command.status,
      limit: command.limit,
      before: command.before,
    });

    // Lazy expiry: reading the list settles anything overdue (and disables its card).
    const current = await Promise.all(interactions.map((interaction) => this.settlement.expireIfOverdue(interaction)));

    return { data: current.map(toInteractionResponse) };
  }
}
