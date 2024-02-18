import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import Sms77Client, { SmsJsonResponse, SmsParams } from 'sms77-client';

if (!globalThis.fetch) {
  // eslint-disable-next-line global-require
  globalThis.fetch = require('node-fetch');
}

export class Sms77SmsProvider implements ISmsProvider {
  id = 'sms77';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private sms77Client: Sms77Client;

  constructor(
    private config: {
      apiKey?: string;
      from?: string;
    }
  ) {
    this.sms77Client = new Sms77Client(config.apiKey, 'Novu');
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const params: SmsParams = {
      from: options.from || this.config.from,
      json: true,
      text: options.content,
      to: options.to,
    };

    const sms77Response = <SmsJsonResponse>await this.sms77Client.sms(params);

    return {
      id: sms77Response.messages[0].id,
      date: new Date().toISOString(),
    };
  }
}
