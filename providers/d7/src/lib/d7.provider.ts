import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios, { Axios } from 'axios';

export class D7SmsProvider implements ISmsProvider {
  id = 'd7';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const url = 'https://api.d7networks.com/messages/v1/send';
    const data = {
      channel: 'sms',
      originator: options.from,
      recipients: [options.to],
      content: options.content,
    };

    const response = await axios({
      headers: {
        Authorization: this.config.apiKey,
      },
      data,
      method: 'post',
      url,
    });

    return {
      id: response.data?.request_id,
      date: new Date().toISOString(),
    };
  }
}
