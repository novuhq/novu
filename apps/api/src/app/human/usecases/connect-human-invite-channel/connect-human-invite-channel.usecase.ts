import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { GenerateConnectOauthUrlCommand } from '../../../integrations/usecases/generate-chat-oath-url/generate-connect-oauth-url.command';
import { GenerateConnectOauthUrl } from '../../../integrations/usecases/generate-chat-oath-url/generate-connect-oauth-url.usecase';
import { IssueTelegramSubscriberLinkCommand } from '../../../telegram-linking/issue-telegram-subscriber-link/issue-telegram-subscriber-link.command';
import { IssueTelegramSubscriberLink } from '../../../telegram-linking/issue-telegram-subscriber-link/issue-telegram-subscriber-link.usecase';
import { HUMAN_INVITE_APP_NAMES } from '../../dtos/human-invite.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import { HumanInviteTokenService } from '../../services/human-invite-token.service';
import { ConnectHumanInviteChannelCommand } from './connect-human-invite-channel.command';

/**
 * Mints a fresh connect link for the app the human picked on the invite page —
 * the same links `human contact invite --via` prints (Telegram start code, Slack OAuth
 * with the Slack user auto-linked), created at click time so they never go stale.
 */
@Injectable()
export class ConnectHumanInviteChannel {
  constructor(
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly deliveryService: HumanDeliveryService,
    private readonly issueTelegramSubscriberLink: IssueTelegramSubscriberLink,
    private readonly generateConnectOauthUrl: GenerateConnectOauthUrl
  ) {}

  async execute(command: ConnectHumanInviteChannelCommand): Promise<{ url: string }> {
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

    if (channel.connected) {
      throw new ConflictException({
        code: 'channel_already_connected',
        message: `You're already connected on ${appName}.`,
      });
    }

    if (command.via === HumanChannelViaEnum.TELEGRAM) {
      const link = await this.issueTelegramSubscriberLink.execute(
        IssueTelegramSubscriberLinkCommand.create({
          environmentId: payload.env,
          organizationId: payload.org,
          integrationIdentifier: channel.integrationIdentifier,
          subscriberId: payload.subscriberId,
        })
      );

      return { url: link.deepLinkUrl };
    }

    const url = await this.generateConnectOauthUrl.execute(
      GenerateConnectOauthUrlCommand.create({
        environmentId: payload.env,
        organizationId: payload.org,
        integrationIdentifier: channel.integrationIdentifier,
        subscriberId: payload.subscriberId,
        connectionMode: 'subscriber',
        autoLinkUser: true,
      })
    );

    return { url };
  }
}
