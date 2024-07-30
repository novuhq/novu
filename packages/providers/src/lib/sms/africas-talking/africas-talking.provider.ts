import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import AfricasTalking from 'africastalking';
import { BaseProvider } from '../../../base.provider';

export class AfricasTalkingSmsProvider
  extends BaseProvider
  implements ISmsProvider
{
  id: SmsProviderIdEnum.AfricasTalking;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private africasTalkingClient: AfricasTalking;

  constructor(
    private config: {
      apiKey: string;
      username: string;
      from?: string;
    }
  ) {
    super();
    this.africasTalkingClient = new AfricasTalking({
      apiKey: config.apiKey,
      username: config.username,
    }).SMS;
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.africasTalkingClient.send(
      this.transform(bridgeProviderData, {
        from: options.from || this.config.from,
        to: options.to,
        message: options.content,
      }).body
    );

    return {
      id: response?.SMSMessageData?.Recipients[0]?.messageId,
      date: new Date().toISOString(),
    };
  }
}
