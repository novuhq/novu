import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { CalculateLimitNovuIntegrationCommand } from './calculate-limit-novu-integration.command';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class CalculateLimitNovuIntegration {
  constructor(private messageRepository: MessageRepository) {}

  static MAX_NOVU_INTEGRATION_MAIL_REQUESTS = parseInt(process.env.MAX_NOVU_INTEGRATION_MAIL_REQUESTS || '300', 10);

  async execute(command: CalculateLimitNovuIntegrationCommand): Promise<{ limit: number; count: number } | undefined> {
    if (process.env.DOCKER_HOSTED_ENV === 'true') {
      return;
    }

    const providerId = this.getProviderId(command.channelType);

    if (providerId === undefined) {
      return;
    }

    const messagesCount = await this.messageRepository.count({
      channel: command.channelType,
      _organizationId: command.organizationId,
      providerId,
      createdAt: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
    });

    return {
      limit: CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_MAIL_REQUESTS,
      count: messagesCount,
    };
  }

  private getProviderId(type: ChannelTypeEnum) {
    switch (type) {
      case ChannelTypeEnum.EMAIL:
        return EmailProviderIdEnum.Novu;
      default:
        return undefined;
    }
  }
}
