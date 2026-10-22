import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';

export class BulkSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.BulkSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly DEFAULT_BASE_URL = 'https://api.bulksms.com/v1/messages';
  protected casing = CasingEnum.CAMEL_CASE;
  private readonly httpClient = createProviderHttpClient();

  constructor(
    private config: {
      apiToken: string;
      from: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const from = this.createFormField(options.from || this.config.from);

    const payload = this.transform(bridgeProviderData, {
      to: options.to,
      body: options.content,
      ...(from && { from }),
      // this userSuppliedId helps bulk-sms to identify the message source as Novu and helps in debugging
      userSuppliedId: 'BLKTM.NOVU.01.00.00',
    });

    const url = this.DEFAULT_BASE_URL;

    const encodedToken = Buffer.from(this.config.apiToken).toString('base64');
    const response = await this.httpClient.post(url, JSON.stringify(payload.body), {
      headers: {
        Authorization: `Basic ${encodedToken}`,
        'Content-Type': 'application/json',
        ...payload.headers,
      },
    });

    return {
      id: response.data[0].id,
      date: new Date().toISOString(),
    };
  }

  createFormField(senderId: string | null) {
    // check if senderId is null or empty string
    if (!senderId || senderId.trim() === '') {
      return null;
    }

    // BulkSMS expects international numbers without the leading '+' (E.164 digits only)
    const normalized = senderId.trim().replace(/^\+/, '');

    // check if senderId string contains only numbers
    if (/^\d+$/.test(normalized)) {
      return {
        type: 'INTERNATIONAL',
        address: normalized,
      };
    }

    // check if senderId string contains alphanumeric characters
    if (/^[a-zA-Z0-9]+$/.test(normalized)) {
      return {
        type: 'ALPHANUMERIC',
        address: normalized,
      };
    }

    return null;
  }
}
