import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

// eslint-disable-next-line import/extensions
const api = require('clicksend/api');

export class ClicksendSmsProvider implements ISmsProvider {
  id = 'clicksend';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      apiKey: string;
      username: string;
      from?: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const smsApi = new api.SMSApi(this.config.username, this.config.apiKey);

    const smsMessage = new api.SmsMessage();
    smsMessage.from = this.config.from;
    smsMessage.to = options.to;
    smsMessage.body = options.content;

    const smsCollection = new api.SmsMessageCollection();
    smsCollection.messages = [smsMessage];

    const response = await smsApi.smsSendPost(smsCollection);

    return {
      id: response.body.data.messages[0].message_id,
      date: response.body.data.messages[0].date,
    };
  }
}
