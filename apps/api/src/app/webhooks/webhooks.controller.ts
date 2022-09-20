import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Logger,
  NotFoundException,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { IntegrationEntity, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { MailFactory } from '../events/services/mail-service/mail.factory';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../integrations/usecases/get-decrypted-integrations';

@Controller('/webhooks')
@UseInterceptors(ClassSerializerInterceptor)
export class WebhooksController {
  private mailFactory = new MailFactory();

  constructor(
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    private messageRepository: MessageRepository
  ) {}

  @Post('/:organizationId/:environmentId/email/:providerId')
  public async emailWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerId') providerId: string,
    @Body() body: any
  ) {
    const integration: IntegrationEntity = await this.getDecryptedIntegrationsUsecase.execute(
      GetDecryptedIntegrationsCommand.create({
        environmentId,
        organizationId,
        providerId: providerId as EmailProviderIdEnum,
        channelType: ChannelTypeEnum.EMAIL,
        findOne: true,
      })
    )[0];

    if (!integration) {
      throw new NotFoundException(`Integration for ${providerId} was not found`);
    }

    const handler = this.mailFactory.getHandler(integration);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${providerId} was not found`);
    }
    handler.buildProvider(integration.credentials);

    const provider = handler.getProvider();
    if (!provider.getMessageId || !provider.parseEventBody) {
      throw new NotFoundException(`Provider with ${providerId} can not handle webhooks`);
    }

    let messageIdentifiers: string | string[] = provider.getMessageId(body);

    if (!Array.isArray(messageIdentifiers)) {
      messageIdentifiers = [messageIdentifiers];
    }

    const events = [];

    for (const messageIdentifier of messageIdentifiers) {
      let message = await this.messageRepository.findById(messageIdentifier);

      if (!message) {
        message = await this.messageRepository.findOne({
          identifier: messageIdentifier,
        });
      }

      if (!message) {
        Logger.error(`Message with ${messageIdentifier} as identifier was not found`);
        continue;
      }

      const event = provider.parseEventBody(body, messageIdentifier);

      events.push({
        id: message._id,
        event,
      });
    }

    return events;
  }
}
