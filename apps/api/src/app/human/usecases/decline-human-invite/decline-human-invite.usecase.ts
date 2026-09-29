import { ConflictException, Injectable } from '@nestjs/common';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import {
  type ActiveHumanInvite,
  HumanInviteTokenService,
  InactiveHumanInviteError,
  toHttpError,
} from '../../services/human-invite-token.service';
import { DeclineHumanInviteCommand } from './decline-human-invite.command';

/** "No thanks" on the invite page: retires the link. Only possible before any app is connected. */
@Injectable()
export class DeclineHumanInvite {
  constructor(
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly deliveryService: HumanDeliveryService
  ) {}

  async execute(command: DeclineHumanInviteCommand): Promise<{ declined: true }> {
    let invite: ActiveHumanInvite;
    try {
      invite = await this.inviteTokens.peek(command.token);
    } catch (err) {
      if (err instanceof InactiveHumanInviteError && err.reason === 'declined') {
        return { declined: true };
      }

      throw toHttpError(err);
    }

    const channels = await this.deliveryService.describeInviteChannels({
      environmentId: invite.payload.env,
      organizationId: invite.payload.org,
      agentId: invite.payload.agentId,
      subscriberId: invite.payload.subscriberId,
    });

    if (channels.some(({ connected }) => connected)) {
      throw new ConflictException({
        code: 'channel_already_connected',
        message: "You're already connected, so there's nothing to decline.",
      });
    }

    try {
      await this.inviteTokens.decline(command.token);
    } catch (err) {
      throw toHttpError(err);
    }

    return { declined: true };
  }
}
