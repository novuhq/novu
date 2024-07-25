import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { SmsClient } from '@azure/communication-sms';
import { SmsProviderIdEnum } from '@novu/shared';

export class AzureSmsProvider implements ISmsProvider {
  id = SmsProviderIdEnum.AzureSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  private smsClient: SmsClient;
  constructor(
    private config: {
      connectionString: string;
    }
  ) {
    this.smsClient = new SmsClient(this.config.connectionString);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const sendResults = await this.smsClient.send({
      from: options.from,
      to: [options.to],
      message: options.content,
      ...bridgeProviderData,
    });

    const sendResult = sendResults[0];

    if (sendResult.successful) {
      return {
        id: sendResult.messageId,
        date: new Date().toISOString(),
      };
    } else {
      throw new Error(sendResult.errorMessage);
    }
  }
}
