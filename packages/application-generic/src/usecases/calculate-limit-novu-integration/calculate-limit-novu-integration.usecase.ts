import { Injectable } from '@nestjs/common';
import { startOfMonth, endOfMonth } from 'date-fns';
import { MessageRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';

import {
  areNovuEmailCredentialsSet,
  areNovuSmsCredentialsSet,
} from '../../utils/novu-integrations';
import { CalculateLimitNovuIntegrationCommand } from './calculate-limit-novu-integration.command';

@Injectable()
export class CalculateLimitNovuIntegration {
  constructor(private messageRepository: MessageRepository) {}

  static MAX_NOVU_INTEGRATION_MAIL_REQUESTS = parseInt(
    process.env.MAX_NOVU_INTEGRATION_MAIL_REQUESTS || '300',
    10
  );

  static MAX_NOVU_INTEGRATION_SMS_REQUESTS = parseInt(
    process.env.MAX_NOVU_INTEGRATION_SMS_REQUESTS || '20',
    10
  );

  async execute(
    command: CalculateLimitNovuIntegrationCommand
  ): Promise<{ limit: number; count: number } | undefined> {
    const channelType = command.channelType;

    if (
      channelType === ChannelTypeEnum.EMAIL &&
      !areNovuEmailCredentialsSet()
    ) {
      return;
    }

    if (channelType === ChannelTypeEnum.SMS && !areNovuSmsCredentialsSet()) {
      return;
    }

    const providerId = CalculateLimitNovuIntegration.getProviderId(channelType);

    if (providerId === undefined) {
      return;
    }
    const limit =
      channelType === ChannelTypeEnum.EMAIL
        ? CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_MAIL_REQUESTS
        : CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_SMS_REQUESTS;

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
      limit
    );

    return {
      limit,
      count: messagesCount,
    };
  }

  static getProviderId(type: ChannelTypeEnum) {
    switch (type) {
      case ChannelTypeEnum.EMAIL:
        return EmailProviderIdEnum.Novu;
      case ChannelTypeEnum.SMS:
        return SmsProviderIdEnum.Novu;
      default:
        return undefined;
    }
  }
}
