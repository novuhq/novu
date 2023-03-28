import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
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
  /*
   * getMessageId?: (body: any) => string[];
   * parseEventBody?: (body: any, identifier: string) => ISMSEventBody;
   * id: string;
   */
  /*
   * getMessageId?: (body: any) => string[];
   * parseEventBody?: (body: any, identifier: string) => ISMSEventBody;
   * id: string;
   */

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const africasTalkingResponseId = await this.africastalkingClient.send({
      from: this.config.from,
      to: options.to,
      message: options.content,
    });

    console.log(africasTalkingResponseId);

    return {
      id: 'PLACEHOLDER',
      date: new Date().toISOString(),
    };
  }
}
