import { Injectable } from '@nestjs/common';
import { IntegrationEntity, MessageRepository, IntegrationRepository, ExecutionDetailsRepository } from '@novu/dal';
import { GetNovuIntegrationCommand } from './get-novu-integration.command';
import { ChannelTypeEnum, NovuProvider, EmailProviderIdEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class GetNovuIntegration {
  constructor(
    private messageRepository: MessageRepository,
    private integrationRepository: IntegrationRepository,
    private executionDetailsRepository: ExecutionDetailsRepository
  ) {}

  async execute(command: GetNovuIntegrationCommand): Promise<IntegrationEntity[]> {
    const sentMessagesCount = await this.executionDetailsRepository.count({
      status: ExecutionDetailsStatusEnum.SUCCESS,
      _organizationId: command.organizationId,
      channel: command.channelType,
    });

    if (sentMessagesCount > 0) {
      return [];
    }

    const activeIntegrationsCount = await this.integrationRepository.count({
      _organizationId: command.organizationId,
      active: true,
      channel: command.channelType,
    });

    if (activeIntegrationsCount > 0) {
      return [];
    }

    const messagesCount = await this.messageRepository.count({
      channel: command.channelType,
      _organizationId: command.organizationId,
      providerId: NovuProvider,
      createdAt: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
    });

    if (messagesCount === 200) {
      return [];
    }

    switch (command.channelType) {
      case ChannelTypeEnum.EMAIL:
        return [this.createNovuEmailIntegration()];
      default:
        return [];
    }
  }

  private createNovuEmailIntegration(): IntegrationEntity {
    const item = new IntegrationEntity();
    item.providerId = NovuProvider;
    item.active = true;
    item.channel = ChannelTypeEnum.EMAIL;

    item.credentials = {
      apiKey: '',
      from: 'no-reply@novu.co',
      senderName: 'Novu',
    };

    return item;
  }

  public static mapProviders(type: ChannelTypeEnum, providerId: string) {
    if (providerId !== NovuProvider) {
      return providerId;
    }

    switch (type) {
      case ChannelTypeEnum.EMAIL:
        return EmailProviderIdEnum.SendGrid;
      default:
        return providerId;
    }
  }
}
