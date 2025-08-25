import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export interface ISmsmodeApiResponse {
  [key: string]: unknown;

  messageId: string;
  originMessageId?: string;
  campaignId?: string;
  acceptedAt: string;
  sentDate?: string;
  channel: {
    channelId: string;
    name: string;
    type: 'SMS' | 'WHATSAPP' | 'RCS';
    flow: 'MARKETING' | 'TRANSACTIONAL' | 'OTP';
  };
  type: 'SMS' | 'WHATSAPP' | 'RCS';
  direction: 'MT' | 'MO';
  recipient: {
    to: string;
  };
  from: string;
  body: {
    text: string;
    stop?: boolean;
    encoding: 'GSM7' | 'UNICODE';
    messagePartCount: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
    length: number;
  };
  price?: {
    amount: string;
    currency: 'EUR';
  };
  status: {
    deliveryDate: string;
    value: 'SCHEDULED' | 'ENROUTE' | 'DELIVERED' | 'UNDELIVERABLE' | 'UNDELIVERED';
    detail?:
      | 'INSUFFICIENT_CREDIT'
      | 'ORGANISATION_MONTHLY_LIMIT_EXCEEDED'
      | 'DAILY_LIMIT_EXCEEDED'
      | 'SPAM'
      | 'INVALID_PHONE_NUMBER'
      | 'BLACKLISTED';
    lookup?: {};
  };
  refClient?: string;
  callbackUrlStatus?: string;
  callbackUrlMo?: string;
  href: string;
}

export class SmsmodeSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Smsmode;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://rest.smsmode.com/sms/v1';
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const sms = this.transform(bridgeProviderData, {
      from: options.from || this.config.from,
      recipient: {
        to: options.to,
      },
      body: {
        text: options.content,
      },
    });

    const response = await axios.create().post<ISmsmodeApiResponse>(`${this.BASE_URL}/messages`, sms.body, {
      headers: {
        'X-Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...sms.headers,
      },
    });

    const { messageId, acceptedAt } = response.data;

    return {
      id: messageId,
      date: acceptedAt,
    };
  }
}
