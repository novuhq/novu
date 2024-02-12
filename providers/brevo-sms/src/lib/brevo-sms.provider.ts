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

export class BrevoSmsProvider implements ISmsProvider {
  id = 'brevo-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://api.brevo.com/v3';

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
      sender: options.from || this.config.from,
      recipient: options.to,
      content: options.content,
    };

    const response = await fetch(`${this.BASE_URL}/transactionalSMS/sms`, {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      agent: new ProxyAgent(),
      body: JSON.stringify(sms),
    });

    const body: { messageId: string } = await response.json();

    return {
      id: body.messageId,
      date: new Date().toISOString(),
    };
  }
}
