import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanInteractionStatusEnum } from '@novu/shared';
import { toInteractionResponse, type InteractionResponseDto } from '../../dtos/interaction-response.dto';
import { GetInteractionCommand } from '../get-interaction/get-interaction.command';
import { GetInteraction } from '../get-interaction/get-interaction.usecase';
import { WaitInteractionCommand } from './wait-interaction.command';

const POLL_INTERVAL_MS = 1000;

/**
 * Long-poll: holds the request open (bounded at 30s — the CLI loops) and
 * returns as soon as the interaction leaves `pending`. Lazy expiry runs on
 * every poll tick via the shared loader, so an overdue interaction resolves
 * to `expired` mid-wait and the delivered card is disabled at that moment.
 */
@Injectable()
export class WaitInteraction {
  constructor(private readonly getInteraction: GetInteraction) {}

  @InstrumentUsecase()
  async execute(command: WaitInteractionCommand): Promise<InteractionResponseDto> {
    const deadline = Date.now() + command.timeoutSeconds * 1000;
    const getCommand = GetInteractionCommand.create({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      identifier: command.identifier,
    });

    let current = await this.getInteraction.load(getCommand);

    while (current.status === HumanInteractionStatusEnum.PENDING && Date.now() + POLL_INTERVAL_MS <= deadline) {
      await new Promise((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
      current = await this.getInteraction.load(getCommand);
    }

    return toInteractionResponse(current);
  }
}
