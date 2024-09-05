import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { SmsClient, SmsSendRequest } from '@azure/communication-sms';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class AzureSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.AzureSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  private smsClient: SmsClient;
  constructor(
    private config: {
      connectionString: string;
    },
  ) {
    super();
    this.smsClient = new SmsClient(this.config.connectionString);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const sendResults = await this.smsClient.send(
      this.transform<SmsSendRequest>(bridgeProviderData, {
        from: options.from,
        to: [options.to],
        message: options.content,
      }).body,
    );

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
