import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { ProxyAgent } from 'proxy-agent';
import 'cross-fetch';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface RequestInit {
    agent: ProxyAgent;
  }
}

export class BrevoSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.BrevoSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://api.brevo.com/v3';
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const sms = this.transform(bridgeProviderData, {
      sender: options.from || this.config.from,
      recipient: options.to,
      content: options.content,
    });

    const response = await fetch(`${this.BASE_URL}/transactionalSMS/sms`, {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...sms.headers,
      },
      agent: new ProxyAgent(),
      body: JSON.stringify(sms.body),
    });

    const body: { messageId: string } = await response.json();

    return {
      id: body.messageId,
      date: new Date().toISOString(),
    };
  }
}
