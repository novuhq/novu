import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { IEmailProvider, IEventBody, ISmsProvider } from '@novu/stateless';
import { MailFactory, decryptCredentials, SmsFactory, ISmsHandler, IMailHandler } from '@novu/application-generic';
import { WebhookCommand } from './webhook.command';

export interface IWebhookResult {
  id: string;
  event: IEventBody;
}

@Injectable()
export class Webhook {
  public readonly mailFactory = new MailFactory();
  public readonly smsFactory = new SmsFactory();
  private provider: IEmailProvider | ISmsProvider;

  constructor(private integrationRepository: IntegrationRepository, private messageRepository: MessageRepository) {}

  async execute(command: WebhookCommand): Promise<IWebhookResult[]> {
    const providerId = command.providerId;

    const integration: IntegrationEntity = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      providerId,
      channel: ChannelTypeEnum.EMAIL,
    });

    if (!integration) {
      throw new NotFoundException(`Integration for ${providerId} was not found`);
    }

    this.createProvider(integration, providerId, command.type);

    if (!this.provider.getMessageId || !this.provider.parseEventBody) {
      throw new NotFoundException(`Provider with ${providerId} can not handle webhooks`);
    }

    return this.parseEvents(command);
  }

  private async parseEvents(command: WebhookCommand): Promise<IWebhookResult[]> {
    const body = command.body;
    let messageIdentifiers: string | string[] = this.provider.getMessageId(body);

    if (!Array.isArray(messageIdentifiers)) {
      messageIdentifiers = [messageIdentifiers];
    }

    const events: IWebhookResult[] = [];

    for (const messageIdentifier of messageIdentifiers) {
      const event = await this.parseEvent(messageIdentifier, command);

      if (!event) {
        continue;
      }

      events.push(event);
    }

    return events;
  }

  private async parseEvent(messageIdentifier, command: WebhookCommand): Promise<IWebhookResult> {
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

  private getHandler(integration, type: 'sms' | 'email'): ISmsHandler | IMailHandler {
    switch (type) {
      case 'sms':
        return this.smsFactory.getHandler(integration);
      default:
        return this.mailFactory.getHandler(integration);
    }
  }

  private createProvider(integration: IntegrationEntity, providerId: string, type: 'sms' | 'email') {
    const handler = this.getHandler(integration, type);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${providerId} was not found`);
    }
    handler.buildProvider(decryptCredentials(integration.credentials));

    this.provider = handler.getProvider();
  }
}
