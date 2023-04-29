import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { startOfMonth, endOfMonth } from 'date-fns';

import { CalculateLimitNovuIntegrationCommand } from './calculate-limit-novu-integration.command';

@Injectable()
export class CalculateLimitNovuIntegration {
  constructor(private messageRepository: MessageRepository) {}

  static MAX_NOVU_INTEGRATION_MAIL_REQUESTS = parseInt(
    process.env.MAX_NOVU_INTEGRATION_MAIL_REQUESTS || '300',
    10
  );

  async execute(
    command: CalculateLimitNovuIntegrationCommand
  ): Promise<{ limit: number; count: number } | undefined> {
    if (!process.env.NOVU_EMAIL_INTEGRATION_API_KEY) {
      return;
    }

    const providerId = CalculateLimitNovuIntegration.getProviderId(
      command.channelType
    );

    if (providerId === undefined) {
      return;
    }

    const messagesCount = await this.messageRepository.count(
      {
        channel: command.channelType,
        _environmentId: command.environmentId,
        providerId,
        createdAt: {
          $gte: startOfMonth(new Date()),
          $lte: endOfMonth(new Date()),
        },
      },
      CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_MAIL_REQUESTS
    );

    return {
      limit: CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_MAIL_REQUESTS,
      count: messagesCount,
    };
  }

  static getProviderId(type: ChannelTypeEnum) {
    switch (type) {
      case ChannelTypeEnum.EMAIL:
        return EmailProviderIdEnum.Novu;
      default:
        return undefined;
    }
  }
}
