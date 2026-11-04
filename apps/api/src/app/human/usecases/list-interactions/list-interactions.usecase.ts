import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionSettlementService } from '../../../agents/human-relay/human-interaction-settlement.service';
import { type InteractionResponseDto, toInteractionResponse } from '../../dtos/interaction-response.dto';
import { RecordVoiceCallEnded } from '../record-voice-call-ended/record-voice-call-ended.usecase';
import { ListInteractionsCommand } from './list-interactions.command';

@Injectable()
export class ListInteractions {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService,
    private readonly recordVoiceCallEnded: RecordVoiceCallEnded
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
    // A dropped post-call webhook also releases a call that has gone quiet.
    const current = await Promise.all(
      interactions.map(async (interaction) => {
        const released = await this.recordVoiceCallEnded.expireIfStale(interaction);

        return this.settlement.expireIfOverdue(released);
      })
    );

    return { data: current.map((entity) => toInteractionResponse(entity)) };
  }
}
