import { Injectable } from '@nestjs/common';
import { IntegrationEntity, MessageRepository, IntegrationRepository } from '@novu/dal';
import { GetNovuIntegrationCommand } from './get-novu-integration.command';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class GetNovuIntegration {
  constructor(private messageRepository: MessageRepository, private integrationRepository: IntegrationRepository) {}

  static MAX_NOVU_INTEGRATIONS = parseInt(process.env.MAX_NOVU_INTEGRATIONS || '300', 10);

  async execute(command: GetNovuIntegrationCommand): Promise<IntegrationEntity | undefined> {
    const providerId = this.getProviderId(command.channelType);

    if (providerId === undefined) {
      return;
    }

    const activeIntegrationsCount = await this.integrationRepository.count({
      _organizationId: command.organizationId,
      active: true,
      channel: command.channelType,
      _environmentId: command.environmentId,
    });

    if (activeIntegrationsCount > 0) {
      return;
    }

    const messagesCount = await this.messageRepository.count({
      channel: command.channelType,
      _organizationId: command.organizationId,
      providerId,
      createdAt: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
    });

    if (messagesCount >= GetNovuIntegration.MAX_NOVU_INTEGRATIONS) {
      // add analytics event.
      throw new Error(`Limit for Novus ${command.channelType.toLowerCase()} provider was reached.`);
    }

    switch (command.channelType) {
      case ChannelTypeEnum.EMAIL:
        return this.createNovuEmailIntegration();
      default:
        return undefined;
    }
  }

  private createNovuEmailIntegration(): IntegrationEntity {
    const item = new IntegrationEntity();
    item.providerId = EmailProviderIdEnum.Novu;
    item.active = true;
    item.channel = ChannelTypeEnum.EMAIL;

    item.credentials = {
      apiKey: '',
      from: 'no-reply@novu.co',
      senderName: 'Novu',
    };

    return item;
  }

  private getProviderId(type: ChannelTypeEnum) {
    switch (type) {
      case ChannelTypeEnum.EMAIL:
        return EmailProviderIdEnum.Novu;
      default:
        return undefined;
    }
  }

  public static mapProviders(type: ChannelTypeEnum, providerId: string) {
    if (![EmailProviderIdEnum.Novu.toString()].includes(providerId)) {
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
