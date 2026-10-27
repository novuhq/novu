import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanContactRepository } from '@novu/dal';
import { HUMAN_INVITE_APP_NAMES } from '../../dtos/human-invite.dto';
import type { SetOperatorDefaultChannelResponseDto } from '../../dtos/human-operator-contact.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { SetOperatorDefaultChannelCommand } from './set-operator-default-channel.command';

/**
 * The operator picks the channel agents reach them on when a message names none. It is the
 * operator's own choice, so an inviter's pick (`contact invite --via`) never replaces it, same as a
 * contact's pick on the invite page. Only a channel they are connected on can be picked.
 */
@Injectable()
export class SetOperatorDefaultChannel {
  constructor(
    private readonly humanOperator: HumanOperatorService,
    private readonly deliveryService: HumanDeliveryService,
    private readonly humanContactRepository: HumanContactRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: SetOperatorDefaultChannelCommand): Promise<SetOperatorDefaultChannelResponseDto> {
    const { agentId, subscriberId } = await this.humanOperator.require({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
    });
    const scope = {
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId,
      subscriberId,
    };

    const { targets } = await this.deliveryService.describeReachability(scope);
    if (!targets.some((target) => target.via === command.via)) {
      throw new BadRequestException({
        code: 'channel_not_connected',
        message: `Connect ${HUMAN_INVITE_APP_NAMES[command.via]} first.`,
      });
    }

    await this.humanContactRepository.setDefaultVia({ ...scope, via: command.via, setBy: 'contact' });

    return { defaultVia: command.via };
  }
}
