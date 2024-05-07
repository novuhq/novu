import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import AfricasTalking from 'africastalking';

export class AfricasTalkingSmsProvider implements ISmsProvider {
  id: 'africas-talking';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private africasTalkingClient: AfricasTalking;

  constructor(
    private config: {
      apiKey: string;
      username: string;
      from?: string;
    }
  ) {
    this.africasTalkingClient = new AfricasTalking({
      apiKey: config.apiKey,
      username: config.username,
    }).SMS;
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.africasTalkingClient.send({
      from: options.from || this.config.from,
      to: options.to,
      message: options.content,
    });

    return {
      id: response?.SMSMessageData?.Recipients[0]?.messageId,
      date: new Date().toISOString(),
    };
  }
}
