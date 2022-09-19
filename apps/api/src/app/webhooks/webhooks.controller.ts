import {
  Body,
  ClassSerializerInterceptor,
  Controller,
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

  @Post('/:orgId/:envId/email/:providerId')
  public async emailWebhook(
    @Param('orgId') orgId: string,
    @Param('envId') envId: string,
    @Param('providerId') providerId: string,
    @Body() body: any
  ) {
    const integration: IntegrationEntity = await this.getDecryptedIntegrationsUsecase.execute(
      GetDecryptedIntegrationsCommand.create({
        environmentId: envId,
        organizationId: orgId,
        providerId: providerId as EmailProviderIdEnum,
        channelType: ChannelTypeEnum.EMAIL,
        findOne: true,
      })
    )[0];

    if (!integration) {
      throw new NotFoundException(`Integration for ${providerId} was not found`);
    }

    const from = integration?.credentials.from || 'no-reply@novu.co';

    const handler = this.mailFactory.getHandler(integration, from);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${providerId} was not found`);
    }
    handler.buildProvider(integration.credentials, from);

    const provider = handler.getProvider();
    if (!provider.getMessageId || !provider.parseEventBody) {
      throw new NotFoundException(`Provider with ${providerId} can not handle webhooks`);
    }

    const messageIdentifire = provider.getMessageId(body);

    let message = await this.messageRepository.findById(messageIdentifire);

    if (!message) {
      message = await this.messageRepository.findOne({
        identifier: messageIdentifire,
      });
    }

    if (!message) {
      throw new NotFoundException(`Message with ${messageIdentifire} as identifire was not found`);
    }

    const event = provider.parseEventBody(body);

    return {
      id: message._id,
      event,
    };
  }
}
