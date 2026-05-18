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

import {
  InvalidTelegramMobileTokenError,
  TelegramMobileLinkTokenService,
} from '../../services/telegram-mobile-link-token.service';
import { ConfigureTelegramAgentWebhookCommand } from '../configure-telegram-agent-webhook/configure-telegram-agent-webhook.command';
import { ConfigureTelegramAgentWebhook } from '../configure-telegram-agent-webhook/configure-telegram-agent-webhook.usecase';
import { ConsumeTelegramMobileLinkCommand } from './consume-telegram-mobile-link.command';

export interface ConsumeTelegramMobileLinkResult {
  success: true;
  botUsername: string;
  webhookUrl: string;
}

@Injectable()
export class ConsumeTelegramMobileLink {
  constructor(
    private readonly tokenService: TelegramMobileLinkTokenService,
    private readonly integrationRepository: IntegrationRepository,
    private readonly configureTelegramWebhookUsecase: ConfigureTelegramAgentWebhook,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ConsumeTelegramMobileLinkCommand): Promise<ConsumeTelegramMobileLinkResult> {
    const payload = this.verifyToken(command.token);

    const claimed = await this.tokenService.claimJti(payload.jti);

    if (!claimed) {
      throw new ConflictException({
        code: 'token_already_used',
        message: 'This setup link has already been used. Generate a new one from your dashboard.',
      });
    }

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
        ConfigureTelegramAgentWebhookCommand.create({
          userId: 'telegram-mobile-link',
          environmentId: payload.env,
          organizationId: payload.org,
          agentIdentifier: payload.aid,
          integrationId: integration._id,
        })
      );

      return {
        success: true,
        botUsername: result.botUsername,
        webhookUrl: result.webhookUrl,
      };
    } catch (err) {
      await this.tokenService.releaseJti(payload.jti);
      this.logger.warn(
        `Telegram mobile setup consume failed for jti=${payload.jti}: ${(err as Error).message}`
      );
      throw err;
    }
  }

  private verifyToken(token: string) {
    try {
      return this.tokenService.verify(token);
    } catch (err) {
      if (err instanceof InvalidTelegramMobileTokenError) {
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
