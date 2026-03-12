import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { endOfMonth, startOfMonth } from 'date-fns';

import { areNovuEmailCredentialsSet, areNovuSmsCredentialsSet } from '../../utils/novu-integrations';
import { CalculateLimitNovuIntegrationCommand } from './calculate-limit-novu-integration.command';

@Injectable()
export class CalculateLimitNovuIntegration {
  constructor(private messageRepository: MessageRepository) {}

  static MAX_NOVU_INTEGRATION_MAIL_REQUESTS = parseInt(process.env.MAX_NOVU_INTEGRATION_MAIL_REQUESTS || '300', 10);

  static MAX_NOVU_INTEGRATION_SMS_REQUESTS = parseInt(process.env.MAX_NOVU_INTEGRATION_SMS_REQUESTS || '20', 10);

  static MAX_NOVU_INTEGRATION_CHAT_REQUESTS = parseInt(process.env.MAX_NOVU_INTEGRATION_CHAT_REQUESTS || '300', 10);

  async execute(command: CalculateLimitNovuIntegrationCommand): Promise<{ limit: number; count: number } | undefined> {
    const { channelType } = command;

    if (channelType === ChannelTypeEnum.EMAIL && !areNovuEmailCredentialsSet()) {
      return;
    }

    if (channelType === ChannelTypeEnum.SMS && !areNovuSmsCredentialsSet()) {
      return;
    }

    const providerId = CalculateLimitNovuIntegration.getProviderId(channelType);

    if (providerId === undefined) {
      return;
    }
    const limit = CalculateLimitNovuIntegration.getLimit(channelType);

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
      case ChannelTypeEnum.CHAT:
        return ChatProviderIdEnum.Novu;
      default:
        return undefined;
    }
  }

  static getLimit(type: ChannelTypeEnum): number {
    switch (type) {
      case ChannelTypeEnum.EMAIL:
        return CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_MAIL_REQUESTS;
      case ChannelTypeEnum.SMS:
        return CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_SMS_REQUESTS;
      case ChannelTypeEnum.CHAT:
        return CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_CHAT_REQUESTS;
      default:
        return 0;
    }
  }
}
