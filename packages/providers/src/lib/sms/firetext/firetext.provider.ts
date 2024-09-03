import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class FiretextSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Firetext;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  private BASE_URL = 'https://www.firetext.co.uk/api/sendsms';

  constructor(
    private config: {
      apiKey?: string;
      from?: string;
    },
  ) {
    super();
  }

  private parseResponse(body: string) {
    const re = /^(\d+):(\d+)\s(.*)$/i;
    const found = body.match(re);
    const code = found?.[1] ?? 'Unknown status code';
    const message = found?.[3] ?? 'Unknown status message';

    return [code, message];
  }

  private parseHeaderId(headers: Headers) {
    return headers.get('X-Message');
  }

  private parseHeaderDate(headers: Headers): string {
    const date = headers.get('Date');

    return date ? new Date(date).toISOString() : new Date().toISOString();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const baseMessage = this.transform<Record<string, string>>(
      bridgeProviderData,
      {
        apiKey: this.config.apiKey,
        to: options.to,
        from: options.from || this.config.from,
        message: options.content,
      },
    );

    const urlSearchParams = new URLSearchParams(baseMessage.body);
    const url = new URL(this.BASE_URL);
    url.search = urlSearchParams.toString();

    const response = await fetch(url.toString());
    const body = await response.text();
    const [code, message] = this.parseResponse(body);

    if (code !== '0') {
      throw new Error(`${code}: ${message}`);
    }

    const messageId = this.parseHeaderId(response.headers);
    const date = this.parseHeaderDate(response.headers);

    return {
      id: messageId,
      date,
    };
  }
}
