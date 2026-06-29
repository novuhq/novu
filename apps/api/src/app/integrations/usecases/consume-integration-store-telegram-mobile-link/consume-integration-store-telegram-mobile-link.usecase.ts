import { BadGatewayException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ChannelTypeEnum, ChatProviderIdEnum, slugify } from '@novu/shared';
import Axios from 'axios';
import shortid from 'shortid';

import {
  IntegrationStoreTelegramMobileLinkPayload,
  InvalidTelegramMobileTokenError,
  TelegramMobileLinkTokenService,
} from '../../../telegram-linking/telegram-mobile-link-token.service';
import { CreateIntegrationCommand } from '../create-integration/create-integration.command';
import { CreateIntegration } from '../create-integration/create-integration.usecase';
import { ConsumeIntegrationStoreTelegramMobileLinkCommand } from './consume-integration-store-telegram-mobile-link.command';

const TELEGRAM_API_TIMEOUT_MS = 10_000;
const TELEGRAM_MAX_RETRIES = 3;
const TELEGRAM_RETRY_DELAY_BASE_MS = 500;
/**
 * Sentinel userId attributed to integrations created via mobile setup. Tracked
 * by analytics in {@link CreateIntegration} but never used as a real Novu user.
 */
const SYNTHETIC_USER_ID = 'telegram-mobile-link';

interface TelegramGetMeResponse {
  ok: boolean;
  result?: { username?: string };
  description?: string;
}

export interface ConsumeIntegrationStoreTelegramMobileLinkResult {
  success: true;
  botUsername: string;
  integrationId: string;
  integrationIdentifier: string;
}

/**
 * Consumes a single-use Telegram mobile-setup token issued from the
 * Integration Store create flow. The visitor is unauthenticated; trust comes
 * from the opaque Redis-backed setup token. On success, creates a brand-new
 * Telegram integration in the issuing environment using the BotFather token
 * supplied from the mobile device.
 *
 * No webhook is registered here — the user wires the integration to an agent
 * separately, which triggers `ConfigureTelegramAgentWebhook`.
 */
@Injectable()
export class ConsumeIntegrationStoreTelegramMobileLink {
  constructor(
    private readonly tokenService: TelegramMobileLinkTokenService,
    private readonly createIntegrationUsecase: CreateIntegration,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(
    command: ConsumeIntegrationStoreTelegramMobileLinkCommand
  ): Promise<ConsumeIntegrationStoreTelegramMobileLinkResult> {
    const claimed = await this.claimToken(command.token);
    const payload = claimed.payload as IntegrationStoreTelegramMobileLinkPayload;

    try {
      const botUsername = await this.callGetMe(command.botToken);
      const baseName = `Telegram @${botUsername}`;
      const identifier = `${slugify(`telegram-${botUsername}`)}-${shortid.generate()}`;

      const integration = await this.createIntegrationUsecase.execute(
        CreateIntegrationCommand.create({
          userId: SYNTHETIC_USER_ID,
          environmentId: payload.env,
          organizationId: payload.org,
          providerId: ChatProviderIdEnum.Telegram,
          channel: ChannelTypeEnum.CHAT,
          name: baseName,
          identifier,
          credentials: { apiToken: command.botToken },
          active: true,
          check: false,
        })
      );

      return {
        success: true,
        botUsername,
        integrationId: integration._id,
        integrationIdentifier: integration.identifier,
      };
    } catch (err) {
      try {
        await this.tokenService.release(command.token, claimed);
      } catch (releaseErr) {
        this.logger.error({ err: releaseErr }, 'Failed to release token during Telegram integration-store rollback');
      }

      this.logger.warn(`Telegram integration-store mobile setup consume failed: ${(err as Error).message}`);

      throw err;
    }
  }

  private async claimToken(token: string) {
    try {
      return await this.tokenService.claim(token, 'integration-store');
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

  /**
   * Lightweight mirror of `ConfigureTelegramAgentWebhook#callGetMe` — uses the
   * BotFather token to fetch the bot username, also validating that the token
   * is real and not revoked. Bypasses the webhook setup, which is the agent
   * use-case's job.
   */
  private async callGetMe(botToken: string): Promise<string> {
    const telegramUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    let lastError: unknown;

    for (let attempt = 0; attempt < TELEGRAM_MAX_RETRIES; attempt += 1) {
      try {
        const { data } = await Axios.get<TelegramGetMeResponse>(telegramUrl, {
          timeout: TELEGRAM_API_TIMEOUT_MS,
          maxRedirects: 0,
          validateStatus: () => true,
        });

        if (!data.ok || !data.result?.username) {
          throw new BadGatewayException(`Telegram getMe failed: ${data.description ?? 'username not returned'}`);
        }

        return data.result.username;
      } catch (err) {
        if (err instanceof BadGatewayException) throw err;

        lastError = err;

        if (attempt < TELEGRAM_MAX_RETRIES - 1) {
          await new Promise((resolve) => {
            setTimeout(resolve, TELEGRAM_RETRY_DELAY_BASE_MS * 2 ** attempt);
          });
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new BadGatewayException(`Failed to reach Telegram API (getMe): ${message}`);
  }
}
