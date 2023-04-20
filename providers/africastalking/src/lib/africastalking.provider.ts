import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import Africastalking from 'africasTalking';

export class AfricastalkingSmsProvider implements ISmsProvider {
  id: 'africastalking';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private africastalkingClient: Africastalking;

  constructor(
    private config: {
      apiKey: string;
      username: string;
      from?: string;
    }
  ) {
    this.africastalkingClient = new Africastalking({
      apiKey: config.apiKey,
      username: config.username,
    }).SMS;
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.africastalkingClient.send({
      from: this.config.from,
      to: options.to,
      message: options.content,
    });

    return {
      id: response?.SMSMessageData?.Recipients[0]?.messageId,
      date: new Date().toISOString(),
    };
  }
}
