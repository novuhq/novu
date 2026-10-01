import { BadRequestException, Injectable } from '@nestjs/common';
import { HumanContactRepository } from '@novu/dal';
import { HUMAN_INVITE_APP_NAMES } from '../../dtos/human-invite.dto';
import { HumanDeliveryService, type HumanInviteVia } from '../../services/human-delivery.service';
import { HumanInviteTokenService } from '../../services/human-invite-token.service';
import { SetHumanInviteDefaultCommand } from './set-human-invite-default.command';

/** The human picks which connected app the agent uses when it doesn't say. Their choice beats the inviter's. */
@Injectable()
export class SetHumanInviteDefault {
  constructor(
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly deliveryService: HumanDeliveryService,
    private readonly humanContactRepository: HumanContactRepository
  ) {}

  async execute(command: SetHumanInviteDefaultCommand): Promise<{ defaultVia: HumanInviteVia }> {
    const { payload } = await this.inviteTokens.requireActive(command.token);
    const appName = HUMAN_INVITE_APP_NAMES[command.via];

    const channels = await this.deliveryService.describeInviteChannels({
      environmentId: payload.env,
      organizationId: payload.org,
      agentId: payload.agentId,
      subscriberId: payload.subscriberId,
    });
    const channel = channels.find(({ via }) => via === command.via);

    if (!channel) {
      throw new BadRequestException({
        code: 'channel_unavailable',
        message: `${appName} isn't offered on this invite.`,
      });
    }

    if (!channel.connected) {
      throw new BadRequestException({ code: 'channel_not_connected', message: `Connect ${appName} first.` });
    }

    await this.humanContactRepository.setDefaultVia({
      environmentId: payload.env,
      organizationId: payload.org,
      agentId: payload.agentId,
      subscriberId: payload.subscriberId,
      via: command.via,
      setBy: 'contact',
    });

    return { defaultVia: command.via };
  }
}
