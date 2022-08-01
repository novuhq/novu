import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

if (!globalThis.fetch) {
  // eslint-disable-next-line global-require
  globalThis.fetch = require('node-fetch');
}

export class GupshupSmsProvider implements ISmsProvider {
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public static BASE_URL = 'http://enterprise.smsgupshup.com/GatewayAPI/rest';

  constructor(
    private config: {
      userId: string;
      password: string;
    }
  ) {}
  id: string;

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const params = {
      send_to: options.to,
      msg: options.content,
      msg_type: 'text',
      auth_scheme: 'plain',
      method: 'sendMessage',
      format: 'text',
      v: '1.1',
      userId: this.config.userId,
      password: this.config.password,
    };

    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    };

    const response = await fetch(GupshupSmsProvider.BASE_URL, opts);
    const body = await response.text();
    const result = body.split(' | ');

    if (result[0] === 'error') {
      throw new Error(`${result[1]} ${result[2]}`);
    }

    return {
      id: result[2],
      date: new Date().toISOString(),
    };
  }
}
