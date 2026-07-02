import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  decryptCredentials,
} from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import Axios from 'axios';

import { TelegramAgentLinkResolver } from '../telegram-agent-link.resolver';
import { TelegramStartCodeService } from '../telegram-start-code.service';
import { IssueTelegramSubscriberLinkCommand } from './issue-telegram-subscriber-link.command';

export interface IssueTelegramSubscriberLinkResult {
  deepLinkUrl: string;
  botUsername: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
}

const TELEGRAM_API_TIMEOUT_MS = 10_000;
const TELEGRAM_MAX_RETRIES = 3;
const TELEGRAM_RETRY_DELAY_BASE_MS = 500;

interface TelegramGetMeResponse {
  ok: boolean;
  result?: {
    username?: string;
  };
  description?: string;
}

@Injectable()
export class IssueTelegramSubscriberLink {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase,
    private readonly startCodeService: TelegramStartCodeService,
    private readonly agentLinkResolver: TelegramAgentLinkResolver
  ) {}

  async execute(command: IssueTelegramSubscriberLinkCommand): Promise<IssueTelegramSubscriberLinkResult> {
    const integration = await this.integrationRepository.findOne(
      {
        identifier: command.integrationIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id providerId credentials'
    );

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationIdentifier} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.Telegram) {
      throw new BadRequestException('Subscriber-link is only available for Telegram integrations.');
    }

    const integrationId = String(integration._id);

    const decrypted = decryptCredentials(integration.credentials as Record<string, string>);
    const botToken = decrypted.apiToken as string | undefined;

    if (!botToken) {
      throw new UnprocessableEntityException(
        'Bot Token is missing from integration credentials. Save the Bot Token and re-run the webhook configuration first.'
      );
    }

    const agent = await this.agentLinkResolver.resolve({
      integrationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      botToken,
    });

    await this.createOrUpdateSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
      })
    );

    const botUsername = await this.callGetMe(botToken);

    let code: string;
    let expiresAt: string;

    try {
      const issued = await this.startCodeService.issue({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentIdentifier: agent.agentIdentifier,
        integrationId,
        subscriberId: command.subscriberId,
      });
      code = issued.code;
      expiresAt = issued.expiresAt;
    } catch {
      throw new ServiceUnavailableException(
        'Could not issue a Telegram connection link because the cache is unavailable. Try again shortly.'
      );
    }

    return {
      expiresAt,
      botUsername,
      deepLinkUrl: this.buildDeepLink(botUsername, code),
    };
  }

  private buildDeepLink(botUsername: string, code: string): string {
    return `https://t.me/${botUsername}?start=${code}`;
  }

  private async callGetMe(botToken: string): Promise<string> {
    const telegramUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    let lastError: unknown;

    for (let attempt = 0; attempt < TELEGRAM_MAX_RETRIES; attempt++) {
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
