import { randomBytes } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { decryptCredentials, encryptSecret } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import Axios from 'axios';

import { ConfigureTelegramAgentWebhookCommand } from './configure-telegram-agent-webhook.command';

const TELEGRAM_API_TIMEOUT_MS = 10_000;
const TELEGRAM_MAX_RETRIES = 3;
const TELEGRAM_RETRY_DELAY_BASE_MS = 500;
/**
 * Every update type from Telegram's Update object (Bot API).
 * @see https://core.telegram.org/bots/api#update
 */
const TELEGRAM_AGENT_WEBHOOK_ALLOWED_UPDATES = [
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  'message_reaction',
  'message_reaction_count',
  'inline_query',
  'chosen_inline_result',
  'callback_query',
  'shipping_query',
  'pre_checkout_query',
  'purchased_paid_media',
  'poll',
  'poll_answer',
  'my_chat_member',
  'chat_member',
  'chat_join_request',
  'chat_boost',
  'removed_chat_boost',
  'managed_bot',
] as const;

interface TelegramSetWebhookResult {
  webhookUrl: string;
  configuredAt: string;
  botUsername: string;
}

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
}

interface TelegramGetMeResponse {
  ok: boolean;
  result?: {
    username?: string;
  };
  description?: string;
}

@Injectable()
export class ConfigureTelegramAgentWebhook {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: ConfigureTelegramAgentWebhookCommand): Promise<TelegramSetWebhookResult> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id identifier credentials providerId'
    );

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationId} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.Telegram) {
      throw new BadRequestException('Integration is not a Telegram provider');
    }

    const link = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agent._id,
        _integrationId: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!link) {
      throw new NotFoundException('Integration is not linked to this agent');
    }

    const decrypted = decryptCredentials(integration.credentials as Record<string, string>);
    const botToken = decrypted.apiToken as string | undefined;

    if (!botToken) {
      throw new UnprocessableEntityException(
        'Bot Token is missing from integration credentials. Please save the Bot Token first.'
      );
    }

    const webhookUrl = this.buildWebhookUrl(agent._id, integration.identifier);
    this.assertHttps(webhookUrl);

    const secretToken = randomBytes(32).toString('hex');

    await this.callSetWebhook(botToken, webhookUrl, secretToken);

    const [, botUsername] = await Promise.all([
      this.integrationRepository.update(
        {
          _id: integration._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { $set: { 'credentials.token': encryptSecret(secretToken) } }
      ),
      this.callGetMe(botToken),
    ]);

    return { webhookUrl, configuredAt: new Date().toISOString(), botUsername };
  }

  private buildWebhookUrl(agentId: string, integrationIdentifier: string): string {
    const base = (process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(
      /\/$/,
      ''
    );

    return `${base}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
  }

  private assertHttps(url: string): void {
    if (!url.startsWith('https://')) {
      throw new BadRequestException(
        'Telegram webhooks require an HTTPS URL. Set API_ROOT_URL to a public HTTPS address.'
      );
    }
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

  private async callSetWebhook(botToken: string, url: string, secretToken: string): Promise<void> {
    const telegramUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    let lastError: unknown;

    for (let attempt = 0; attempt < TELEGRAM_MAX_RETRIES; attempt++) {
      try {
        const { data } = await Axios.post<TelegramApiResponse>(
          telegramUrl,
          { url, secret_token: secretToken, allowed_updates: [...TELEGRAM_AGENT_WEBHOOK_ALLOWED_UPDATES] },
          {
            timeout: TELEGRAM_API_TIMEOUT_MS,
            maxRedirects: 0,
            validateStatus: () => true,
          }
        );

        if (!data.ok) {
          throw new BadGatewayException(
            `Telegram rejected the webhook registration: ${data.description ?? 'unknown error'}`
          );
        }

        return;
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
    throw new BadGatewayException(`Failed to reach Telegram API: ${message}`);
  }
}
