import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntegrationEntity, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { IEmailProvider } from '@novu/stateless';
import { MailFactory } from '../../../events/services/mail-service/mail.factory';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { EmailWebhookCommand } from './email-webhook.command';

@Injectable()
export class EmailWebhook {
  private mailFactory = new MailFactory();
  private provider: IEmailProvider;

  constructor(
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    private messageRepository: MessageRepository
  ) {}

  async execute(command: EmailWebhookCommand): Promise<any[]> {
    const providerId = command.providerId as EmailProviderIdEnum;
    const body = command.body;

    const integration: IntegrationEntity = await this.getDecryptedIntegrationsUsecase.execute(
      GetDecryptedIntegrationsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        providerId: providerId,
        channelType: ChannelTypeEnum.EMAIL,
        findOne: true,
      })
    )[0];

    if (!integration) {
      throw new NotFoundException(`Integration for ${providerId} was not found`);
    }

    this.createProvider(integration, providerId);

    if (!this.provider.getMessageId || !this.provider.parseEventBody) {
      throw new NotFoundException(`Provider with ${providerId} can not handle webhooks`);
    }

    return this.parseEvents(body);
  }

  private async parseEvents(body) {
    let messageIdentifiers: string | string[] = this.provider.getMessageId(body);

    if (!Array.isArray(messageIdentifiers)) {
      messageIdentifiers = [messageIdentifiers];
    }

    const events = [];

    for (const messageIdentifier of messageIdentifiers) {
      const event = await this.parseEvent(messageIdentifier, body);

      if (!event) {
        continue;
      }

      events.push({
        id: messageIdentifier,
        event,
      });
    }

    return events;
  }

  private async parseEvent(messageIdentifier, body) {
    let message = await this.messageRepository.findById(messageIdentifier);

    if (!message) {
      message = await this.messageRepository.findOne({
        identifier: messageIdentifier,
      });
    }

    if (!message) {
      Logger.error(`Message with ${messageIdentifier} as identifier was not found`);

      return;
    }

    return this.provider.parseEventBody(body, messageIdentifier);
  }

  private createProvider(integration: IntegrationEntity, providerId: EmailProviderIdEnum) {
    const handler = this.mailFactory.getHandler(integration);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${providerId} was not found`);
    }
    handler.buildProvider(integration.credentials);

    this.provider = handler.getProvider();
  }
}
