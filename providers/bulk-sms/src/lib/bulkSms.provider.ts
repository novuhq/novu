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

export class BulkSmsSmsProvider implements ISmsProvider {
  id = 'bulksms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private BASE_URL = 'http://login.bulksmsoffers.com/api/sendhttp.php?';

  constructor(
    private config: {
      authKey?: string;
      sender?: string;
      route?: string;
      dltEntity?: string;
    }
  ) {}

  private parseHeaderDate(headers: Headers): string {
    const date = headers.get('Date');

    return date ? new Date(date).toISOString() : new Date().toISOString();
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const baseMessage = {
      apiKey: this.config.authKey,
      to: options.to,
      sender: this.config.sender,
      route: this.config.route,
      message: encodeURIComponent(options.content),
    };

    const url =
      this.BASE_URL +
      'authkey=' +
      baseMessage.apiKey +
      '&mobiles=' +
      baseMessage.to +
      '&message=' +
      baseMessage.message +
      '&sender=' + baseMessage.sender + '&route=' + baseMessage.route ;

    const response = await fetch(url.toString());

    const body = await response.text();
    
    const date = this.parseHeaderDate(response.headers);

    return {
      id: body,
      date: date,
    };
  }
}
