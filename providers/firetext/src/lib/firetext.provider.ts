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

export class FiretextSmsProvider implements ISmsProvider {
  id = 'firetext';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private BASE_URL = 'https://www.firetext.co.uk/api/sendsms';

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {}

  private parseResponse(body: string) {
    const re = /^(\d+):(\d+)\s(.*)$/i;
    const found = body.match(re);
    const code = found?.[1] ?? 'Unknown status code';
    const message = found?.[3] ?? 'Unknown status message';

    return [code, message];
  }

  private getMessageId(headers: Headers) {
    return headers.get('X-Message');
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const baseMessage = {
      apiKey: this.config.apiKey,
      to: options.to,
      from: this.config.from,
      message: options.content,
    };

    const urlSearchParams = new URLSearchParams(baseMessage);
    const url = new URL(this.BASE_URL);
    url.search = urlSearchParams.toString();

    const response = await fetch(url.toString());
    const body = await response.text();
    const [code, message] = this.parseResponse(body);

    if (code !== '0') {
      throw new Error(`${code}: ${message}`);
    }

    const messageId = this.getMessageId(response.headers);

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}
