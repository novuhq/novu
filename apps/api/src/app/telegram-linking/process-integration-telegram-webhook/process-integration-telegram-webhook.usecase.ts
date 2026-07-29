import { BadGatewayException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { decryptCredentials, PinoLogger } from '@novu/application-generic';
import { ChannelEndpointRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import Axios from 'axios';

import { LinkTelegramChatToSubscriberCommand } from '../link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.command';
import { LinkTelegramChatToSubscriber } from '../link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.usecase';
import {
  SUBSCRIBER_LINK_DUPLICATE_REPLY,
  SUBSCRIBER_LINK_EXPIRED_REPLY,
  SUBSCRIBER_LINK_INVALID_REPLY,
  SUBSCRIBER_LINK_SUCCESS_REPLY,
  SUBSCRIBER_LINK_WRONG_BOT_REPLY,
  TELEGRAM_INTEGRATION_LINK_SCOPE,
} from '../telegram-linking.constants';
import { TelegramStartCodeService } from '../telegram-start-code.service';
import {
  extractTelegramChatIdFromUpdate,
  extractTelegramMessageText,
  extractTelegramStartToken,
  buildTelegramBotApiUrl,
} from '../telegram-webhook.utils';
import { ProcessIntegrationTelegramWebhookCommand } from './process-integration-telegram-webhook.command';

const TELEGRAM_API_TIMEOUT_MS = 10_000;

@Injectable()
export class ProcessIntegrationTelegramWebhook {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly startCodeService: TelegramStartCodeService,
    private readonly linkTelegramChatToSubscriber: LinkTelegramChatToSubscriber,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ProcessIntegrationTelegramWebhookCommand): Promise<void> {
    const integration = await this.integrationRepository.findOne(
      {
        identifier: command.integrationIdentifier,
        _environmentId: command.environmentId,
      },
      '_id identifier providerId credentials _organizationId'
    );

    if (!integration || integration.providerId !== ChatProviderIdEnum.Telegram) {
      throw new NotFoundException();
    }

    const credentials = decryptCredentials(integration.credentials as Record<string, string>);
    const configuredSecret = credentials.token as string | undefined;

    if (!configuredSecret) {
      throw new NotFoundException();
    }

    if (!command.secretToken || command.secretToken !== configuredSecret) {
      throw new UnauthorizedException();
    }

    const botToken = credentials.apiToken as string | undefined;
    if (!botToken) {
      throw new NotFoundException();
    }

    const startToken = extractTelegramStartToken(extractTelegramMessageText(command.update));
    if (!startToken) {
      return;
    }

    const chatId = extractTelegramChatIdFromUpdate(command.update);
    if (!chatId) {
      this.logger.warn('Telegram /start payload received but chat.id is missing — dropping as invalid control input');

      return;
    }

    const organizationId = integration._organizationId;
    const integrationId = String(integration._id);

    const result = await this.startCodeService.consumeIfMatches(startToken, {
      environmentId: command.environmentId,
      organizationId,
      integrationId,
      agentIdentifier: TELEGRAM_INTEGRATION_LINK_SCOPE,
    });

    if (result.status === 'mismatch') {
      await this.sendReply(botToken, chatId, SUBSCRIBER_LINK_WRONG_BOT_REPLY);

      return;
    }

    if (result.status === 'consumed') {
      const { payload } = result;

      try {
        const linkResult = await this.linkTelegramChatToSubscriber.execute(
          LinkTelegramChatToSubscriberCommand.create({
            environmentId: payload._environmentId,
            organizationId: payload._organizationId,
            agentIdentifier: payload.agentIdentifier,
            integrationId: payload._integrationId,
            subscriberId: payload.subscriberId,
            chatId,
            context: payload.context,
          })
        );

        const reply = linkResult.created ? SUBSCRIBER_LINK_SUCCESS_REPLY : SUBSCRIBER_LINK_DUPLICATE_REPLY;
        await this.sendReply(botToken, chatId, reply);
      } catch (err) {
        this.logger.warn(
          `Failed to link Telegram chat to subscriber for integration ${integration.identifier}: ${(err as Error).message}`
        );
        await this.sendReply(botToken, chatId, SUBSCRIBER_LINK_INVALID_REPLY);
      }

      return;
    }

    const existing = await this.channelEndpointRepository.findByPlatformIdentity({
      _environmentId: command.environmentId,
      _organizationId: organizationId,
      integrationIdentifier: integration.identifier,
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpointField: 'chatId',
      endpointValue: chatId,
    });

    const reply = existing ? SUBSCRIBER_LINK_DUPLICATE_REPLY : SUBSCRIBER_LINK_EXPIRED_REPLY;
    await this.sendReply(botToken, chatId, reply);
  }

  private async sendReply(botToken: string, chatId: string, text: string): Promise<void> {
    try {
      const { data } = await Axios.post(
        buildTelegramBotApiUrl(botToken, 'sendMessage'),
        { chat_id: chatId, text },
        { timeout: TELEGRAM_API_TIMEOUT_MS, maxRedirects: 0, validateStatus: () => true }
      );

      if (!data?.ok) {
        throw new BadGatewayException(`Telegram sendMessage failed: ${data?.description ?? 'unknown error'}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to send Telegram subscriber-link reply: ${(err as Error).message}`);
    }
  }
}
