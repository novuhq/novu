import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';

import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';

interface ICmMessageResult {
  to: string;
  status: string;
  reference?: string;
  messageErrorCode: number;
  messageDetails?: string | null;
}

interface ICmResponse {
  details: string;
  errorCode: number;
  messages?: ICmMessageResult[];
}

export class CmTelecomSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.CmTelecom;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  private readonly BASE_URL = 'https://gw.messaging.cm.com/v1.0/message';
  private readonly httpClient = createProviderHttpClient();

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

    const { data } = await this.httpClient.post<ICmResponse>(this.BASE_URL, payload.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-CM-PRODUCTTOKEN': this.config.productToken,
      },
    });

    const message = data.messages?.[0];

    if (message && (message.status !== 'Accepted' || message.messageErrorCode !== 0)) {
      throw new Error(`CM.com rejected the message: ${message.messageDetails || data.details}`);
    }

    return {
      id: message?.reference || options.id || 'unknown',
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
