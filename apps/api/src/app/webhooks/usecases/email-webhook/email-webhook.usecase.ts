import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { IEmailEventBody, IEmailProvider } from '@novu/stateless';
import { MailFactory } from '../../../events/services/mail-service/mail.factory';
import { decryptCredentials } from '../../../shared/services/encryption';
import { EmailWebhookCommand } from './email-webhook.command';

export interface IWebhookResult {
  id: string;
  event: IEmailEventBody;
}

@Injectable()
export class EmailWebhook {
  private mailFactory = new MailFactory();
  private provider: IEmailProvider;

  constructor(private integrationRepository: IntegrationRepository, private messageRepository: MessageRepository) {}

  async execute(command: EmailWebhookCommand): Promise<IWebhookResult[]> {
    const providerId = command.providerId as EmailProviderIdEnum;
    const body = command.body;

    const integration: IntegrationEntity = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      providerId,
      channel: ChannelTypeEnum.EMAIL,
    });

    if (!integration) {
      throw new NotFoundException(`Integration for ${providerId} was not found`);
    }

    this.createProvider(integration, providerId);

    if (!this.provider.getMessageId || !this.provider.parseEventBody) {
      throw new NotFoundException(`Provider with ${providerId} can not handle webhooks`);
    }

    return this.parseEvents(body);
  }

  private async parseEvents(body): Promise<IWebhookResult[]> {
    let messageIdentifiers: string | string[] = this.provider.getMessageId(body);

    if (!Array.isArray(messageIdentifiers)) {
      messageIdentifiers = [messageIdentifiers];
    }

    const events: IWebhookResult[] = [];

    for (const messageIdentifier of messageIdentifiers) {
      const event = await this.parseEvent(messageIdentifier, body);

      if (!event) {
        continue;
      }

      events.push(event);
    }

    return events;
  }

  private async parseEvent(messageIdentifier, command: EmailWebhookCommand): Promise<IWebhookResult> {
    const message = await this.messageRepository.findOne({
      identifier: messageIdentifier,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!message) {
      Logger.error(`Message with ${messageIdentifier} as identifier was not found`);

      return;
    }

    const event = this.provider.parseEventBody(command.body, messageIdentifier);

    return {
      id: messageIdentifier,
      event,
    };
  }

  private createProvider(integration: IntegrationEntity, providerId: EmailProviderIdEnum) {
    const handler = this.mailFactory.getHandler(integration);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${providerId} was not found`);
    }
    handler.buildProvider(decryptCredentials(integration.credentials));

    this.provider = handler.getProvider();
  }
}
