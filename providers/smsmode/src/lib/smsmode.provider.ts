import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { ProxyAgent } from 'proxy-agent';
import 'cross-fetch';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface RequestInit {
    agent: ProxyAgent;
  }
}

export class SmsmodeSmsProvider implements ISmsProvider {
  id = 'smsmode';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://rest.smsmode.com/sms/v1';

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const sms = {
      from: options.from || this.config.from,
      recipient: {
        to: options.to,
      },
      body: {
        text: options.content,
      },
    };

    const response = await fetch(`${this.BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      agent: new ProxyAgent(),
      body: JSON.stringify(sms),
    });

    const body: { messageId: string; acceptedAt: string } =
      await response.json();

    return {
      id: body.messageId,
      date: body.acceptedAt,
    };
  }
}
