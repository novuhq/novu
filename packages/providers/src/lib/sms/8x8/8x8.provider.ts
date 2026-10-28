import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

/**
 * 8x8 SMS API — sends a single SMS by POSTing a JSON body to the sub-account messages endpoint.
 * See https://developer.8x8.com/connect/reference/messages (Send SMS API).
 */
export class EightByEightSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.EightByEightSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  private readonly BASE_URL = 'https://sms.8x8.com/api/v1';

  constructor(
    private config: {
      apiKey?: string;
      subAccountId?: string;
      from?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const url = `${this.BASE_URL}/subaccounts/${this.config.subAccountId}/messages`;

    const data = this.transform(bridgeProviderData, {
      destination: options.to,
      text: options.content,
      // `source` is the alphanumeric/numeric Sender ID; optional per the 8x8 spec.
      ...((options.from || this.config.from) && { source: options.from || this.config.from }),
      ...(options.id && { clientMessageId: options.id }),
    });

    const response = await axios.create().post(url, data.body, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...data.headers,
      },
    });

    // 8x8 accepts the request with HTTP 2xx but may still REJECT the message in the body.
    if (response.data?.status?.code === 'REJECTED') {
      throw new Error(`8x8 SMS rejected: ${response.data?.status?.description ?? 'unknown reason'}`);
    }

    return {
      id: response.data?.umid,
      date: new Date().toISOString(),
    };
  }
}
