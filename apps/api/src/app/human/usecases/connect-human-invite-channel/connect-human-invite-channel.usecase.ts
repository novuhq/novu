import { BadGatewayException, BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { GenerateConnectOauthUrlCommand } from '../../../integrations/usecases/generate-chat-oath-url/generate-connect-oauth-url.command';
import { GenerateConnectOauthUrl } from '../../../integrations/usecases/generate-chat-oath-url/generate-connect-oauth-url.usecase';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import { IssueTelegramSubscriberLinkCommand } from '../../../telegram-linking/issue-telegram-subscriber-link/issue-telegram-subscriber-link.command';
import { IssueTelegramSubscriberLink } from '../../../telegram-linking/issue-telegram-subscriber-link/issue-telegram-subscriber-link.usecase';
import { HUMAN_INVITE_APP_NAMES } from '../../dtos/human-invite.dto';
import { trackAgentInboxInviteAccepted } from '../../services/agent-inbox-analytics';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import { type HumanInviteTokenPayload, HumanInviteTokenService } from '../../services/human-invite-token.service';
import { RequestAddressVerificationCommand } from '../request-address-verification/request-address-verification.command';
import {
  RequestAddressVerification,
  type RequestAddressVerificationResult,
} from '../request-address-verification/request-address-verification.usecase';
import { ConnectHumanInviteChannelCommand } from './connect-human-invite-channel.command';

export type ConnectHumanInviteChannelResult =
  | { url: string }
  | (RequestAddressVerificationResult & { via: HumanChannelViaEnum.EMAIL });

/**
 * Mints a fresh connect link for the app the human picked on the invite page —
 * the same links `human contact invite --via` prints (Telegram start code, Slack OAuth
 * with the Slack user auto-linked), created at click time so they never go stale.
 * Email starts double opt-in instead of minting a URL.
 */
@Injectable()
export class ConnectHumanInviteChannel {
  constructor(
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly deliveryService: HumanDeliveryService,
    private readonly issueTelegramSubscriberLink: IssueTelegramSubscriberLink,
    private readonly generateConnectOauthUrl: GenerateConnectOauthUrl,
    private readonly requestAddressVerification: RequestAddressVerification,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly analyticsService: AnalyticsService
  ) {}

  async execute(command: ConnectHumanInviteChannelCommand): Promise<ConnectHumanInviteChannelResult> {
    const { payload } = await this.inviteTokens.requireActive(command.token);
    const result = await this.connect(command, payload);
    this.trackAccepted(payload, command.via);

    return result;
  }

  private async connect(
    command: ConnectHumanInviteChannelCommand,
    payload: HumanInviteTokenPayload
  ): Promise<ConnectHumanInviteChannelResult> {
    const appName = HUMAN_INVITE_APP_NAMES[command.via];

    const channels = await this.deliveryService.describeInviteChannels({
      environmentId: payload.env,
      organizationId: payload.org,
      agentId: payload.agentId,
      subscriberId: payload.subscriberId,
    });
    const channel = channels.find(({ via }) => via === command.via);

    if (!channel?.available) {
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

    if (command.via === HumanChannelViaEnum.EMAIL) {
      if (!command.address?.trim()) {
        throw new BadRequestException({
          code: 'address_required',
          message: 'Enter an email address to verify.',
        });
      }

      try {
        const result = await this.requestAddressVerification.execute(
          RequestAddressVerificationCommand.create({
            environmentId: payload.env,
            organizationId: payload.org,
            agentId: payload.agentId,
            subscriberId: payload.subscriberId,
            via: HumanChannelViaEnum.EMAIL,
            address: command.address,
          })
        );

        return { ...result, via: HumanChannelViaEnum.EMAIL };
      } catch (err) {
        if (err instanceof BadGatewayException) {
          throw new BadGatewayException({
            error: 'delivery_failed',
            message: 'Could not send the verification email. Try again in a moment.',
          });
        }

        throw err;
      }
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

  /**
   * Counts the accepted invite for the agent's owner. The invite page has no session, so the owner is the
   * user the invite's environment has its key from: the hidden Novu user of their account, the same user
   * every request with that key carries. In the background, so it never slows or fails the invite page.
   */
  private trackAccepted(payload: HumanInviteTokenPayload, channel: HumanChannelViaEnum): void {
    if (isKeylessOrganization(payload.org)) {
      return;
    }

    this.environmentRepository
      .findOne({ _id: payload.env, _organizationId: payload.org }, ['apiKeys'])
      .then((environment) => {
        const userId = environment?.apiKeys?.[0]?._userId;
        if (userId) {
          trackAgentInboxInviteAccepted(
            this.analyticsService,
            { userId: String(userId), organizationId: payload.org },
            { agentId: payload.agentId, channel }
          );
        }
      })
      .catch(() => undefined);
  }
}
