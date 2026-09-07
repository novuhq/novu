import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { encryptSecret, PinoLogger } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { ConfigureTelegramWebhookCommand } from '../configure-telegram-webhook/configure-telegram-webhook.command';
import { ConfigureTelegramWebhook } from '../configure-telegram-webhook/configure-telegram-webhook.usecase';
import { IssueTelegramSubscriberLinkCommand } from '../issue-telegram-subscriber-link/issue-telegram-subscriber-link.command';
import { IssueTelegramSubscriberLink } from '../issue-telegram-subscriber-link/issue-telegram-subscriber-link.usecase';
import {
  InvalidTelegramMobileTokenError,
  TelegramMobileLinkTokenPayload,
  TelegramMobileLinkTokenService,
} from '../telegram-mobile-link-token.service';
import { ConsumeTelegramMobileLinkCommand } from './consume-telegram-mobile-link.command';

export interface ConsumeTelegramMobileLinkResult {
  success: true;
  botUsername: string;
  webhookUrl: string;
  deepLinkUrl?: string;
}

@Injectable()
export class ConsumeTelegramMobileLink {
  constructor(
    private readonly tokenService: TelegramMobileLinkTokenService,
    private readonly integrationRepository: IntegrationRepository,
    private readonly configureTelegramWebhookUsecase: ConfigureTelegramWebhook,
    private readonly issueTelegramSubscriberLink: IssueTelegramSubscriberLink,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ConsumeTelegramMobileLinkCommand): Promise<ConsumeTelegramMobileLinkResult> {
    const claimed = await this.claimToken(command.token);
    const payload = claimed.payload as TelegramMobileLinkTokenPayload;

    try {
      const integration = await this.integrationRepository.findOne(
        {
          _id: payload.iid,
          _environmentId: payload.env,
          _organizationId: payload.org,
        },
        '_id identifier providerId'
      );

      if (!integration) {
        throw new NotFoundException('Integration referenced by this link no longer exists.');
      }

      if (integration.providerId !== ChatProviderIdEnum.Telegram) {
        throw new BadRequestException('This link is not a Telegram setup link.');
      }

      await this.integrationRepository.update(
        {
          _id: integration._id,
          _environmentId: payload.env,
          _organizationId: payload.org,
        },
        { $set: { 'credentials.apiToken': encryptSecret(command.botToken) } }
      );

      const result = await this.configureTelegramWebhookUsecase.execute(
        ConfigureTelegramWebhookCommand.create({
          userId: 'telegram-mobile-link',
          environmentId: payload.env,
          organizationId: payload.org,
          integrationIdentifier: integration.identifier,
        })
      );

      let deepLinkUrl: string | undefined;

      if (payload.sid) {
        try {
          const subscriberLink = await this.issueTelegramSubscriberLink.execute(
            IssueTelegramSubscriberLinkCommand.create({
              environmentId: payload.env,
              organizationId: payload.org,
              integrationIdentifier: integration.identifier,
              subscriberId: payload.sid,
            })
          );
          deepLinkUrl = subscriberLink.deepLinkUrl;
        } catch (err) {
          this.logger.warn(
            `Telegram subscriber-link issue failed for integrationId=${integration._id}, subscriberId=${payload.sid}: ${(err as Error).message}`
          );
        }
      }

      return {
        success: true,
        botUsername: result.botUsername,
        webhookUrl: result.webhookUrl,
        deepLinkUrl,
      };
    } catch (err) {
      try {
        await this.tokenService.release(command.token, claimed);
      } catch (releaseErr) {
        this.logger.error(`Telegram mobile setup token rollback failed: ${(releaseErr as Error).message}`);
      }
      this.logger.warn(`Telegram mobile setup consume failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private async claimToken(token: string) {
    try {
      return await this.tokenService.claim(token, 'agent');
    } catch (err) {
      if (err instanceof InvalidTelegramMobileTokenError) {
        if (err.reason === 'used') {
          throw new ConflictException({
            code: 'token_already_used',
            message: 'This setup link has already been used. Generate a new one from your dashboard.',
          });
        }

        throw new UnauthorizedException({
          code: err.reason === 'expired' ? 'token_expired' : 'token_invalid',
          message:
            err.reason === 'expired'
              ? 'This setup link has expired. Generate a new one from your dashboard.'
              : 'This setup link is invalid.',
        });
      }

      throw err;
    }
  }
}
