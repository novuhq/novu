import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

// eslint-disable-next-line import/extensions
import * as api from 'clicksend/api';

export class ClicksendSmsProvider implements ISmsProvider {
  id = 'clicksend';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  private smsApi: any;

  constructor(
    private config: {
      username: string;
      apiKey: string;
    }
  ) {
    this.smsApi = new api.SMSApi(config.username, config.apiKey);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const smsMessage = new api.SmsMessage();
    smsMessage.source = 'sdk';
    smsMessage.to = options.to;
    smsMessage.body = options.content;

    const smsCollection = new api.SmsMessageCollection();
    smsCollection.messages = [smsMessage];

    const response = await this.smsApi.smsSendPost(smsCollection);

    return {
      id: response.body.data.messages[0].message_id,
      date: response.body.data.messages[0].date,
    };
  }
}
