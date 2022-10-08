import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import AfricasTalking from 'africasTalking';

export class AfricastalkingSmsProvider implements ISmsProvider {
  id = 'africasTalking';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private africasTalkingClient: AfricasTalking.SMS;

  constructor(
    private config: {
      apiKey: string;
      username: string;
      from?: string;
    }
  ) {
    this.africasTalkingClient = AfricasTalking({
      apiKey: config.apiKey,
      username: config.username,
    }).SMS;
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    
    const africasTalkingResponseId: string = await new Promise((resolve, reject) => {
      
      this.africasTalkingClient.send({
        from : this.config.from,
        to: options.to,
        message: options.content
      }).then((responseData) => {
        return resolve(responseData.SMSMessageData.Recipients[0].messageId);
      }).catch((err) => {
        reject(err);
      })

    });

    return {
      id: africasTalkingResponseId,
      date: new Date().toISOString(),
    };
  }
}
