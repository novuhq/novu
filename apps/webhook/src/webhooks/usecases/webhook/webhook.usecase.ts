import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { IEmailProvider, ISmsProvider } from '@novu/stateless';
import { MailFactory, SmsFactory, ISmsHandler, IMailHandler } from '@novu/application-generic';

import { WebhookCommand } from './webhook.command';

import { CreateExecutionDetails } from '../execution-details/create-execution-details.usecase';

import { IWebhookResult } from '../../dtos/webhooks-response.dto';
import { WebhookTypes } from '../../interfaces/webhook.interface';

@Injectable()
export class Webhook {
  public readonly mailFactory = new MailFactory();
  public readonly smsFactory = new SmsFactory();
  private provider: IEmailProvider | ISmsProvider;

  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    private integrationRepository: IntegrationRepository,
    private messageRepository: MessageRepository
  ) {}

  async execute(command: WebhookCommand): Promise<IWebhookResult[]> {
    const providerId = command.providerId;
    const channel: ChannelTypeEnum = command.type === 'email' ? ChannelTypeEnum.EMAIL : ChannelTypeEnum.SMS;

    const integration: IntegrationEntity = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      providerId,
      channel,
    });

    if (!integration) {
      throw new NotFoundException(`Integration for ${providerId} was not found`);
    }

    this.createProvider(integration, providerId, command.type);

    if (!this.provider.getMessageId || !this.provider.parseEventBody) {
      throw new NotFoundException(`Provider with ${providerId} can not handle webhooks`);
    }

    return await this.parseEvents(command, channel);
  }

  private async parseEvents(command: WebhookCommand, channel: ChannelTypeEnum): Promise<IWebhookResult[]> {
    const body = command.body;
    const messageIdentifiers: string[] = this.provider.getMessageId(body);

    const events: IWebhookResult[] = [];

    for (const messageIdentifier of messageIdentifiers) {
      const event = await this.parseEvent(messageIdentifier, command, channel);

      if (event === undefined) {
        continue;
      }

      events.push(event);
    }

    return events;
  }

  private async parseEvent(
    messageIdentifier,
    command: WebhookCommand,
    channel: ChannelTypeEnum
  ): Promise<IWebhookResult | undefined> {
    const message = await this.messageRepository.findOne({
      identifier: messageIdentifier,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    } as any);

    if (!message) {
      Logger.error(`Message with ${messageIdentifier} as identifier was not found`);

      return;
    }

    const event = this.provider.parseEventBody(command.body, messageIdentifier);

    if (event === undefined) {
      return undefined;
    }

    const parsedEvent = {
      id: messageIdentifier,
      event,
    };

    /**
     * TODO: Individually performing the creation of the execution details because here we can pass message that contains
     * most of the __foreign keys__ we need. But we can't take advantage of a bulk write of all events. Besides the writing
     * being hiding inside auxiliary methods of the use case.
     */
    await this.createExecutionDetails.execute({
      message,
      webhook: command,
      webhookEvent: parsedEvent,
      channel,
    });

    return parsedEvent;
  }

  private getHandler(integration, type: WebhookTypes): ISmsHandler | IMailHandler {
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
    handler.buildProvider({});

    this.provider = handler.getProvider();
  }
}
