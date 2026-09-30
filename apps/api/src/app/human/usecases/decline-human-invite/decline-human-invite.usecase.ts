import { ConflictException, Injectable } from '@nestjs/common';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import {
  type ActiveHumanInvite,
  type HumanInviteTokenPayload,
  HumanInviteTokenService,
  InactiveHumanInviteError,
  type RetiredHumanInvite,
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

    if (await this.isConnected(invite.payload)) {
      throw alreadyConnected();
    }

    const retired = await this.retire(command.token);

    if (!retired) {
      return { declined: true };
    }

    // The person may have finished connecting an app (Telegram /start, Slack OAuth) between the check
    // above and retiring the link. Connecting wins, so put the link back; a failed check must not
    // leave it retired either.
    let connected: boolean;
    try {
      connected = await this.isConnected(invite.payload);
    } catch (err) {
      await this.restore(command.token, retired);

      throw err;
    }

    if (connected) {
      await this.restore(command.token, retired);

      throw alreadyConnected();
    }

    return { declined: true };
  }

  private async retire(token: string): Promise<RetiredHumanInvite | null> {
    try {
      return await this.inviteTokens.decline(token);
    } catch (err) {
      throw toHttpError(err);
    }
  }

  private async restore(token: string, retired: RetiredHumanInvite): Promise<void> {
    try {
      await this.inviteTokens.undoDecline(token, retired);
    } catch (err) {
      throw toHttpError(err);
    }
  }

  private async isConnected(payload: HumanInviteTokenPayload): Promise<boolean> {
    const channels = await this.deliveryService.describeInviteChannels({
      environmentId: payload.env,
      organizationId: payload.org,
      agentId: payload.agentId,
      subscriberId: payload.subscriberId,
    });

    return channels.some(({ connected }) => connected);
  }
}

function alreadyConnected(): ConflictException {
  return new ConflictException({
    code: 'channel_already_connected',
    message: "You're already connected, so there's nothing to decline.",
  });
}
