import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';

import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class CmTelecomSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.CmTelecom;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  private readonly BASE_URL = 'https://gw.messaging.cm.com/v1.0/message';

  constructor(
    private config: {
      productToken?: string;
      from?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      messages: {
        msg: [
          {
            allowedChannels: ['SMS'],
            from: options.from || this.config.from,
            to: [{ number: this.formatPhoneNumber(options.to) }],
            body: {
              type: 'auto',
              content: options.content,
            },
            reference: options.id,
          },
        ],
      },
    });

    const { data } = await axios.post(this.BASE_URL, payload.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-CM-PRODUCTTOKEN': this.config.productToken,
      },
    });

    return {
      id: data.details?.[0]?.reference || options.id || 'unknown',
      date: new Date().toISOString(),
    };
  }

  private formatPhoneNumber(phoneNumber: string): string {
    let formatted = phoneNumber.replace(/[\s\-()]/g, '');

    if (formatted.startsWith('+')) {
      formatted = '00' + formatted.substring(1);
    } else if (!formatted.startsWith('00')) {
      formatted = '00' + formatted;
    }

    return formatted;
  }
}
